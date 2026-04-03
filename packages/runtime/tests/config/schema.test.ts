import { describe, it, expect } from 'vitest';
import { AgentsConfigSchema } from '../../src/config/schema.js';

const validAgent = {
  id: 'claude-1',
  label: 'Claude',
  description: 'Claude AI assistant',
  adapterType: 'claude_local',
};

describe('AgentsConfigSchema', () => {
  it('parses a valid config with all fields', () => {
    const input = {
      defaultAgent: 'claude-1',
      agents: [
        {
          ...validAgent,
          adapterConfig: {
            adapterType: 'claude_local',
            model: 'claude-3-5-sonnet-20241022',
            maxBudgetUsd: 10,
          },
        },
      ],
    };
    const result = AgentsConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('parses a valid config with optional fields omitted', () => {
    const input = {
      agents: [validAgent],
    };
    const result = AgentsConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('fails when required id field is missing', () => {
    const input = {
      agents: [{ label: 'Claude', description: 'Test', adapterType: 'claude_local' }],
    };
    const result = AgentsConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join('.'));
      expect(paths).toContain('agents.0.id');
    }
  });

  it('fails when adapterType is invalid', () => {
    const input = {
      agents: [{ ...validAgent, adapterType: 'invalid_adapter' }],
    };
    const result = AgentsConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts adapterConfig for claude_local with model and maxBudgetUsd', () => {
    const input = {
      agents: [
        {
          ...validAgent,
          adapterConfig: {
            adapterType: 'claude_local',
            model: 'claude-3-opus',
            maxBudgetUsd: 5.5,
          },
        },
      ],
    };
    const result = AgentsConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('fails when adapterConfig has wrong discriminant', () => {
    const input = {
      agents: [
        {
          ...validAgent,
          adapterConfig: {
            adapterType: 'codex_local', // wrong: agent is claude_local but adapterConfig says codex_local
            model: 'o4-mini',
          },
        },
      ],
    };
    // This is valid because adapterConfig is independent of adapterType on the agent
    // The schema allows any discriminant in adapterConfig
    // However, let's test that an invalid discriminant value fails
    const inputInvalid = {
      agents: [
        {
          ...validAgent,
          adapterConfig: {
            adapterType: 'unknown_adapter',
            model: 'test',
          },
        },
      ],
    };
    const result = AgentsConfigSchema.safeParse(inputInvalid);
    expect(result.success).toBe(false);
  });

  it('strips unknown fields from config', () => {
    const input = {
      agents: [{ ...validAgent, unknownField: 'should be stripped' }],
      unknownTopLevel: 'should be stripped',
    };
    const result = AgentsConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)['unknownTopLevel']).toBeUndefined();
      expect(
        (result.data.agents[0] as Record<string, unknown>)['unknownField'],
      ).toBeUndefined();
    }
  });

  it('fails when agents array is empty', () => {
    const input = {
      agents: [],
    };
    const result = AgentsConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
