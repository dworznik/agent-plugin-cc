import { join, resolve } from 'node:path';
import { chmodSync, readdirSync } from 'node:fs';
import { beforeAll, beforeEach, afterEach } from 'vitest';

const SHIMS_DIR = resolve(__dirname, '..', 'fixtures', 'shims');
let origPath: string;

export function useShimPath() {
  beforeAll(() => {
    for (const file of readdirSync(SHIMS_DIR)) {
      chmodSync(join(SHIMS_DIR, file), 0o755);
    }
  });
  beforeEach(() => {
    origPath = process.env['PATH'] ?? '';
    process.env['PATH'] = `${SHIMS_DIR}:${origPath}`;
  });
  afterEach(() => {
    process.env['PATH'] = origPath;
  });
}
