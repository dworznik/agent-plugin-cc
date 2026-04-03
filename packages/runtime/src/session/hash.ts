import { createHash } from 'node:crypto';

// SHA-256 hash of absolute workspace root path for deterministic partitioning (per D-08, SESS-04)
export function workspaceHash(absolutePath: string): string {
  return createHash('sha256').update(absolutePath).digest('hex');
}
