import { BigQuery } from '@google-cloud/bigquery';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

interface GcpCredentials {
  project_id: string;
}

const keyFilePath = path.join(process.cwd(), 'gcp-credentials.json');
const LOOKBACK_MONTHS = 6;
const datasetId = 'billing_export';
const tableId = 'gcp_billing_export_resource_v1_013BC6_DDDCDB_B267C6';

export async function GET() {
  try {
    const credentialsStr = await fs.readFile(keyFilePath, 'utf-8');
    const credentials = JSON.parse(credentialsStr) as GcpCredentials;
    const projectId = credentials.project_id;

    const bigquery = new BigQuery({
      keyFilename: keyFilePath,
      projectId,
    });

    const fullTableName = `${projectId}.${datasetId}.${tableId}`;

    const getBillingQuery = `
      SELECT
        service.description AS service,
        invoice.month AS invoice_month,
        SUM(cost) AS total_cost,
        ANY_VALUE(currency) AS currency
      FROM \`${fullTableName}\`
      WHERE invoice.month >= FORMAT_DATE('%Y%m', DATE_SUB(CURRENT_DATE(), INTERVAL ${LOOKBACK_MONTHS - 1} MONTH))
      GROUP BY service, invoice_month
      HAVING SUM(cost) > 0.01
      ORDER BY invoice_month ASC, total_cost DESC;
    `;

    const [billingJob] = await bigquery.createQueryJob({ query: getBillingQuery });
    const [billingRows] = await billingJob.getQueryResults();

    const monthsSet = new Set<string>();
    const monthTotals = new Map<string, number>();
    const serviceMap = new Map<string, Map<string, number>>();
    let currency = 'USD';

    for (const row of billingRows as Array<{ service: string; invoice_month: string; total_cost: number; currency: string }>) {
      const month = row.invoice_month;
      const cost = Number(row.total_cost) || 0;
      monthsSet.add(month);
      currency = row.currency || currency;
      monthTotals.set(month, (monthTotals.get(month) ?? 0) + cost);

      if (!serviceMap.has(row.service)) {
        serviceMap.set(row.service, new Map());
      }
      serviceMap.get(row.service)!.set(month, cost);
    }

    const months = Array.from(monthsSet).sort((a, b) => a.localeCompare(b));

    const serviceRows = Array.from(serviceMap.entries()).map(([service, monthMap]) => {
      const monthly = months.map(month => ({
        month,
        cost: (monthMap.get(month) ?? 0).toFixed(2),
      }));
      const latestMonth = months[months.length - 1];
      const latestCost = latestMonth ? monthMap.get(latestMonth) ?? 0 : 0;

      return {
        service,
        monthly,
        latestCost,
      };
    });

    serviceRows.sort((a, b) => b.latestCost - a.latestCost);

    const services = serviceRows.map(row => ({
      service: row.service,
      monthly: row.monthly,
    }));

    const totals = months.map(month => ({
      month,
      total: (monthTotals.get(month) ?? 0).toFixed(2),
    }));

    return NextResponse.json({
      currency,
      lastUpdated: new Date().toISOString(),
      months,
      totals,
      services,
    });

  } catch (error) {
    console.error('Failed to fetch GCP billing data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch GCP billing data', details: errorMessage },
      { status: 500 }
    );
  }
}
