// Shared payload + response types used by both daemon and extension.

export interface AgentRequest {
  url:          string;
  title:        string;
  selection:    string;
  fullText:     string;
  mode:         AgentMode;
  prompt?:      string;
  // Web3 signals
  hasEthereum?: boolean;
  hasSolana?:   boolean;
  isKnownDapp?: boolean;
  contracts?:   string[];
  chain?:       string | null;
  walletAddress?: string | null;
}

export type AgentMode = "summarize" | "explain" | "web3_explain" | "freeform";

export interface AgentResponse {
  answer:    string;
  actions:   AgentAction[];
  metadata:  Record<string, unknown>;
  mode?:     AgentMode;
}

export interface AgentAction {
  label:   string;
  type:    "navigate" | "delegate" | "copy" | "log";
  payload: string;
}

export interface HealthResponse {
  ok:             boolean;
  version:        string;
  brain:          string;
  openclawOnline: boolean;
  ollamaOnline:   boolean;
  ts:             string;
}
