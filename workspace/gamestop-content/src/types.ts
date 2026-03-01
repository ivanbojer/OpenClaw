export type DraftStatus = "pending" | "posted" | "rejected";

export interface Story {
  kind: "tweet" | "news";
  externalId: string;
  source: string;
  text: string;
  url: string;
  publishedAt: string;
}

export interface Draft {
  id: string;
  storyRef: string;
  source: string;
  url: string;
  summary: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  tweetUrl?: string;
  announcedAt?: string;
}

export interface HistoryState {
  seen: string[];
}

export interface DraftState {
  drafts: Draft[];
}

export interface CursorState {
  channels: Record<string, string>;
}

export interface RunMetrics {
  posted: number;
  pending: number;
}
