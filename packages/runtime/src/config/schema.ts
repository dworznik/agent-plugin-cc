import { z } from 'zod';

// Per-adapter config schemas (discriminated union per D-04)
const ClaudeLocalConfigSchema = z.object({
  adapterType: z.literal('claude_local'),
  model: z.string().optional(),
  maxBudgetUsd: z.number().optional(),
});
const CodexLocalConfigSchema = z.object({
  adapterType: z.literal('codex_local'),
  provider: z.string().optional(),
  model: z.string().optional(),
});
const CursorConfigSchema = z.object({
  adapterType: z.literal('cursor'),
  model: z.string().optional(),
});
const GeminiLocalConfigSchema = z.object({
  adapterType: z.literal('gemini_local'),
  model: z.string().optional(),
});
const OpencodeLocalConfigSchema = z.object({
  adapterType: z.literal('opencode_local'),
  model: z.string().optional(),
});
const PiLocalConfigSchema = z.object({
  adapterType: z.literal('pi_local'),
  model: z.string().optional(),
});

// Discriminated union for adapterConfig (per D-04)
export const AdapterConfigSchema = z.discriminatedUnion('adapterType', [
  ClaudeLocalConfigSchema,
  CodexLocalConfigSchema,
  CursorConfigSchema,
  GeminiLocalConfigSchema,
  OpencodeLocalConfigSchema,
  PiLocalConfigSchema,
]);

// adapterType enum values (per CONF-03)
export const ADAPTER_TYPES = [
  'claude_local',
  'codex_local',
  'cursor',
  'gemini_local',
  'opencode_local',
  'pi_local',
] as const;

// Single agent entry schema
export const AgentSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  adapterType: z.enum(ADAPTER_TYPES),
  adapterConfig: AdapterConfigSchema.optional(),
});

// Top-level agents.json schema (per CONF-01, D-05 strips unknown fields)
export const AgentsConfigSchema = z.object({
  defaultAgent: z.string().optional(),
  agents: z.array(AgentSchema).min(1),
});
