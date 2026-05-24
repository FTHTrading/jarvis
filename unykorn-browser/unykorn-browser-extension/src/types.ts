// Shared types for extension ↔ daemon communication.
// Must stay framework-agnostic (no React imports).

export type AgentMode = "summarize" | "explain" | "web3_explain" | "freeform";

export interface AgentRequest {
  url:          string;
  title:        string;
  selection:    string;
  fullText:     string;
  mode:         AgentMode;
  prompt?:      string;
  hasEthereum?: boolean;
  hasSolana?:   boolean;
  isKnownDapp?: boolean;
  contracts?:   string[];
  chain?:       string | null;
  walletAddress?: string | null;
}

export interface AgentResponse {
  ok:       boolean;
  answer?:  string;
  actions?: AgentAction[];
  metadata?: Record<string, unknown>;
  mode?:    AgentMode;
  error?:   string;
}

export interface AgentAction {
  label:   string;
  type:    "navigate" | "delegate" | "copy" | "log";
  payload: string;
}

export type AgentState = "passive" | "armed" | "active";

export interface DaemonHealth {
  ok:             boolean;
  version:        string;
  brain:          string;
  openclawOnline: boolean;
  ollamaOnline:   boolean;
  ts:             string;
}
