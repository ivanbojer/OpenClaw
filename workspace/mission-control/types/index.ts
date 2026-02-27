export type InitiativeStatus = "scoping" | "building" | "shipping" | "blocked";

export type Initiative = {
  id: string;
  title: string;
  owner: string;
  status: InitiativeStatus;
  eta: string;
  highlights: string[];
  dependencies?: string[];
};

export type AutomationJob = {
  id: string;
  title: string;
  cadence: string;
  nextRun: string;
  status: "queued" | "running" | "healthy" | "error";
  notes?: string;
};

export type Signal = {
  id: string;
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  detail: string;
};

export type Integration = {
  id: string;
  name: string;
  status: "ok" | "warn" | "error";
  description: string;
};

export type Idea = {
  id: string;
  title: string;
  impact: "moonshot" | "quick win" | "experiment";
  pitch: string;
};

export type HealthStatus = "healthy" | "warn" | "error";

export type OpsConsoleLaunchdJob = {
  raw: string;
  label: string;
  pid: number | null;
  statusCode: number | null;
  state: "running" | "idle" | "error";
};

export type OpsConsole = {
  cron: {
    lines: string[];
    status: HealthStatus;
    summary: string;
  };
  launchd: {
    jobs: OpsConsoleLaunchdJob[];
    status: HealthStatus;
    summary: string;
  };
  logs: {
    morningBrief: string;
    backup: string;
    issues: {
      morningBrief: boolean;
      backup: boolean;
    };
  };
};
