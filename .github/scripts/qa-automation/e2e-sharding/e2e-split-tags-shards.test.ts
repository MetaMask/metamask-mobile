import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

describe('e2e-split-tags-shards', () => {
  it('does not duplicate changed specs on release/* PRs', () => {
    const repositoryRoot = process.cwd();
    const tempDir = mkdtempSync(path.join(tmpdir(), 'e2e-sharding-'));
    const specPath = path.join(tempDir, 'smoke.spec.ts');
    const outputPath = path.join(tempDir, 'github-output');
    const scriptPath = path.join(
      repositoryRoot,
      '.github/scripts/qa-automation/e2e-sharding/e2e-split-tags-shards.mjs',
    );
    const changedSpecPath = path.relative(repositoryRoot, specPath);
    const retryPath = path.join(tempDir, 'smoke-retry-1.spec.ts');

    writeFileSync(
      specPath,
      "import { test } from '@playwright/test';\ntest.describe('SmokeAccounts', () => {});\n",
    );

    try {
      const result = spawnSync(process.execPath, [scriptPath], {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          BASE_DIR: tempDir,
          CHANGED_SPEC_FILES: changedSpecPath,
          E2E_TIMINGS_PATH: path.join(tempDir, 'missing-timings.json'),
          GITHUB_OUTPUT: outputPath,
          GITHUB_TOKEN: '',
          PLATFORM: 'android',
          PR_BASE_REF: 'release/1.0.0',
          PR_NUMBER: '123',
          RUN_ATTEMPT: '1',
          TEST_SUITE_TAG: 'SmokeAccounts',
          TOTAL_SPLITS: '1',
          SPLIT_NUMBER: '1',
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(readFileSync(outputPath, 'utf8')).toContain(
        `spec_files=${changedSpecPath}`,
      );
      expect(existsSync(retryPath)).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('duplicates changed specs on main-target PRs', () => {
    const repositoryRoot = process.cwd();
    const tempDir = mkdtempSync(path.join(tmpdir(), 'e2e-sharding-'));
    const specPath = path.join(tempDir, 'smoke.spec.ts');
    const outputPath = path.join(tempDir, 'github-output');
    const scriptPath = path.join(
      repositoryRoot,
      '.github/scripts/qa-automation/e2e-sharding/e2e-split-tags-shards.mjs',
    );
    const changedSpecPath = path.relative(repositoryRoot, specPath);
    const retryPath = path.join(tempDir, 'smoke-retry-1.spec.ts');
    const fetchStubPath = path.join(tempDir, 'fetch-stub.cjs');

    writeFileSync(
      specPath,
      "import { test } from '@playwright/test';\ntest.describe('SmokeAccounts', () => {});\n",
    );
    writeFileSync(
      fetchStubPath,
      `global.fetch = async () => ({
  ok: true,
  async json() {
    return { data: { repository: { pullRequest: { labels: { nodes: [] } } } } };
  },
  async text() {
    return '';
  },
});\n`,
    );

    try {
      const result = spawnSync(process.execPath, [scriptPath], {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          BASE_DIR: tempDir,
          CHANGED_SPEC_FILES: changedSpecPath,
          E2E_TIMINGS_PATH: path.join(tempDir, 'missing-timings.json'),
          GITHUB_OUTPUT: outputPath,
          GITHUB_TOKEN: '',
          NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${fetchStubPath}`,
          PLATFORM: 'android',
          PR_BASE_REF: 'main',
          PR_NUMBER: '123',
          RUN_ATTEMPT: '1',
          TEST_SUITE_TAG: 'SmokeAccounts',
          TOTAL_SPLITS: '1',
          SPLIT_NUMBER: '1',
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(readFileSync(outputPath, 'utf8')).toContain(
        `spec_files=${changedSpecPath} ${changedSpecPath.replace(
          /\.spec\.(ts|js)$/u,
          '-retry-1.spec.$1',
        )}`,
      );
      expect(existsSync(retryPath)).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
