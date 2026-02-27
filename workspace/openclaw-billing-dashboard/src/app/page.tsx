"use client";

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyValue {
  month: string;
  cost: string;
}

interface ServiceBreakdown {
  service: string;
  monthly: MonthlyValue[];
}

interface MonthTotal {
  month: string;
  total: string;
}

interface BillingData {
  currency: string;
  lastUpdated: string;
  months: string[];
  totals: MonthTotal[];
  services: ServiceBreakdown[];
}

const formatMonthLabel = (month: string) => {
  if (!month || month.length !== 6) return month;
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(4)) - 1;
  const date = new Date(year, monthIndex);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
};

const formatCurrency = (value: string, currency: string, hideSymbol: boolean = false) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `${value} ${currency}`;
  }
  return `${numericValue.toFixed(2)}${hideSymbol ? '' : ` ${currency}`}`;
};

// A consistent color palette for services
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#a4de6c',
  '#d0ed57', '#83a6ed', '#8dd1e1', '#f5b5c9', '#c3e6cb', '#a1c9f4', '#b2dfdb', '#ffccbc',
];

export default function HomePage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/gcp');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
      }
      const result: BillingData = await response.json();
      setData(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-8">Loading billing data...</div>;
    }

    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      );
    }

    if (!data || data.months.length === 0) {
      return <div className="text-center p-8">No billing data for the selected window.</div>;
    }

    // Prepare data for the stacked bar chart
    const chartData = data.months.map(month => {
      const monthEntry: { [key: string]: string | number } = { monthLabel: formatMonthLabel(month) };
      let totalForMonth = 0;
      data.services.forEach(service => {
        const monthlyCost = service.monthly.find(m => m.month === month)?.cost || "0.00";
        monthEntry[service.service] = parseFloat(monthlyCost);
        totalForMonth += parseFloat(monthlyCost);
      });
      monthEntry.total = totalForMonth.toFixed(2);
      return monthEntry;
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.totals.map(total => (
            <div key={total.month} className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">{formatMonthLabel(total.month)}</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(total.total, data.currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto mb-8">
          <table className="min-w-full bg-gray-800 rounded-lg">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4">Service</th>
                {data.months.map(month => (
                  <th key={month} className="text-right p-4">
                    {formatMonthLabel(month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.services.map(service => (
                <tr key={service.service} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4">{service.service}</td>
                  {service.monthly.map(entry => (
                    <td key={`${service.service}-${entry.month}`} className="p-4 text-right font-mono">
                      {formatCurrency(entry.cost, data.currency, true)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-bold mb-4 text-center">Monthly Service Cost Breakdown</h2>
        <div className="bg-gray-800 p-4 rounded-lg" style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20, right: 30, left: 20, bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="monthLabel" stroke="#999" tick={{ fill: '#ccc' }} />
              <YAxis stroke="#999" tick={{ fill: '#ccc' }} tickFormatter={(value) => formatCurrency(value, data.currency, true)} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                formatter={(value: any, name: any) => [`${formatCurrency(value?.toFixed(2), data.currency)}`, name]}
                labelFormatter={(label: any) => `Month: ${label}`}
                contentStyle={{ backgroundColor: '#333', border: 'none' }} 
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#ddd' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" formatter={(value) => <span style={{ color: '#ccc' }}>{value}</span>} />
              {data.services.map((service, index) => (
                <Bar
                  key={service.service}
                  dataKey=[REDACTED]
                  stackId="a"
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-12 bg-gray-900 text-gray-200">
      <div className="z-10 w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8 text-center">
          OpenClaw Billing Dashboard
        </h1>
        {renderContent()}
      </div>
    </main>
  );
}
