// Adapter type enum - the six supported CLIs (per CONF-03, D-04)
export type AdapterType = 'claude_local' | 'codex_local' | 'cursor' | 'gemini_local' | 'opencode_local' | 'pi_local';

// Per-adapter config shapes (discriminated by adapterType, per D-04)
export interface ClaudeLocalConfig { adapterType: 'claude_local'; model?: string; maxBudgetUsd?: number; }
export interface CodexLocalConfig { adapterType: 'codex_local'; provider?: string; model?: string; }
export interface CursorConfig { adapterType: 'cursor'; model?: string; }
export interface GeminiLocalConfig { adapterType: 'gemini_local'; model?: string; }
export interface OpencodeLocalConfig { adapterType: 'opencode_local'; model?: string; }
export interface PiLocalConfig { adapterType: 'pi_local'; model?: string; }
export type AdapterConfig = ClaudeLocalConfig | CodexLocalConfig | CursorConfig | GeminiLocalConfig | OpencodeLocalConfig | PiLocalConfig;

// Agent config entry from agents.json (per CONF-01)
export interface AgentConfig {
  id: string;
  label: string;
  description: string;
  adapterType: AdapterType;
  adapterConfig?: AdapterConfig;
}

// Top-level agents.json schema (per CONF-01)
export interface AgentsConfig {
  defaultAgent?: string;
  agents: AgentConfig[];
}

// Process execution result (used by runner and adapters)
export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

// Adapter execution result (returned by adapter.execute)
export interface AdapterResult {
  output: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Adapter execution options
export interface ExecuteOptions {
  timeoutMs?: number;
  sessionId?: string;
  env?: Record<string, string>;
  cwd?: string;
}

// Session data stored on disk (per D-07)
export interface SessionData {
  agentId: string;
  adapterType: AdapterType;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  adapterState?: unknown;
}

// Structured log entry (per LOG-01)
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  jobId: string;
  message: string;
  durationMs?: number;
}

// Hook interfaces (per D-03, ADPT-02)
export interface HookSet {
  buildAgentEnv: (agentId: string, baseEnv: Record<string, string>) => Record<string, string>;
  resolveInstructions: (agentId: string, prompt: string) => string;
  loadSession: (workspaceRoot: string, agentId: string) => SessionData | null;
  saveSession: (workspaceRoot: string, agentId: string, session: SessionData) => void;
  emitLog: (entry: LogEntry) => void;
}
