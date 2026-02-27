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
