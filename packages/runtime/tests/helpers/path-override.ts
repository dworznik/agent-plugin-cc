import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { chmodSync, readdirSync } from 'node:fs';
import { beforeAll, beforeEach, afterEach } from 'vitest';

const SHIMS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'shims');
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
