import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobMetadata {
  jobId: string;
  agentId: string;
  status: JobStatus;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp, set on terminal state
  pid: number | null; // null until worker starts
  error?: string; // set on 'failed' status (ERR-04)
}

export function getJobPath(statePath: string, jobId: string): string {
  return join(statePath, 'jobs', `${jobId}.json`);
}

export function getResultPath(statePath: string, jobId: string): string {
  return join(statePath, 'results', jobId);
}

export function getCancelPath(statePath: string, jobId: string): string {
  return join(statePath, 'cancel', jobId);
}

export function readJob(statePath: string, jobId: string): JobMetadata | null {
  const p = getJobPath(statePath, jobId);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as JobMetadata;
}

export function writeJob(statePath: string, meta: JobMetadata): void {
  const p = getJobPath(statePath, meta.jobId);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(meta, null, 2), 'utf-8');
}

export function updateJob(statePath: string, jobId: string, update: Partial<JobMetadata>): void {
  const existing = readJob(statePath, jobId);
  if (!existing) throw new Error(`Job not found: ${jobId}`);
  writeJob(statePath, { ...existing, ...update });
}

/**
 * Compare-and-set: update job only if current status matches one of expectedStatuses.
 * Returns true if update was applied, false if status didn't match.
 */
export function casUpdateJob(
  statePath: string,
  jobId: string,
  expectedStatuses: JobStatus[],
  update: Partial<JobMetadata>,
): boolean {
  const existing = readJob(statePath, jobId);
  if (!existing) throw new Error(`Job not found: ${jobId}`);
  if (!expectedStatuses.includes(existing.status)) return false;
  writeJob(statePath, { ...existing, ...update });
  return true;
}
