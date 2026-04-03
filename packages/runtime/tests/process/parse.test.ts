import { describe, it, expect } from 'vitest';
import { parseJSON, parseJSONL } from '../../src/process/parse.js';

describe('parseJSON', () => {
  it('returns parsed object for valid JSON', () => {
    const result = parseJSON('{"key":"value","num":42}');
    expect(result).toEqual({ key: 'value', num: 42 });
  });

  it('returns null for malformed JSON', () => {
    const result = parseJSON('{ not valid json }');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseJSON('');
    expect(result).toBeNull();
  });

  it('handles JSON arrays', () => {
    const result = parseJSON<number[]>('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('handles JSON primitives', () => {
    expect(parseJSON('null')).toBeNull();
    expect(parseJSON('"hello"')).toBe('hello');
    expect(parseJSON('42')).toBe(42);
  });
});

describe('parseJSONL', () => {
  it('returns array of parsed objects for valid JSONL', () => {
    const input = '{"a":1}\n{"b":2}\n{"c":3}';
    const result = parseJSONL(input);
    expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it('skips invalid lines', () => {
    const input = '{"a":1}\nnot valid json\n{"c":3}';
    const result = parseJSONL(input);
    expect(result).toEqual([{ a: 1 }, { c: 3 }]);
  });

  it('returns empty array for empty string', () => {
    const result = parseJSONL('');
    expect(result).toEqual([]);
  });

  it('handles trailing newline', () => {
    const input = '{"a":1}\n{"b":2}\n';
    const result = parseJSONL(input);
    expect(result).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('handles lines with only whitespace by skipping them', () => {
    const input = '{"a":1}\n   \n{"c":3}';
    const result = parseJSONL(input);
    expect(result).toEqual([{ a: 1 }, { c: 3 }]);
  });
});
