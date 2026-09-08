import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENTRYPOINT = path.join(
  __dirname,
  'run-compute-e2e-platform-flags.mjs',
);

/**
 * Parse a GITHUB_OUTPUT file, including `key<<DELIMITER` heredoc blocks.
 */
function parseGithubOutput(raw: string): Record<string, string> {
  const outputs: Record<string, string> = {};
  const lines = raw.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    const heredoc = /^([^=<]+)<<(.+)$/u.exec(line);
    if (heredoc) {
      const [, key, delimiter] = heredoc;
      const collected: string[] = [];
      index += 1;
      while (index < lines.length && lines[index] !== delimiter) {
        collected.push(lines[index]);
        index += 1;
      }
      outputs[key] = collected.join('\n');
      continue;
    }

    const separator = line.indexOf('=');
    if (separator > 0) {
      outputs[line.slice(0, separator)] = line.slice(separator + 1);
    }
  }

  return outputs;
}

/**
 * Run the entrypoint in a child process with a controlled environment.
 *
 * The env is built from scratch rather than inheriting `process.env` — this
 * suite runs inside GitHub Actions, where ambient `GITHUB_*` variables would
 * otherwise leak in and make the scenarios non-deterministic.
 */
function runEntrypoint(scenarioEnv: Record<string, string>) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-flags-'));
  const outputPath = path.join(tempDir, 'github-output');
  fs.writeFileSync(outputPath, '');

  const result = spawnSync(process.execPath, [ENTRYPOINT], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      GITHUB_OUTPUT: outputPath,
      ...scenarioEnv,
    },
  });

  const outputs = parseGithubOutput(fs.readFileSync(outputPath, 'utf8'));
  fs.rmSync(tempDir, { recursive: true, force: true });

  return { status: result.status, stdout: result.stdout ?? '', outputs };
}

const bothPlatformsPR = {
  ALL_CHANGES_COUNT: '1',
  IGNORABLE_COUNT: '0',
  E2E_TEST_FILES_COUNT: '0',
  E2E_TEST_OR_IGNORABLE_COUNT: '0',
  E2E_WORKFLOWS_COUNT: '0',
  ANDROID_COUNT: '1',
  IOS_COUNT: '1',
  ANDROID_OR_IGNORABLE_COUNT: '1',
  IOS_OR_IGNORABLE_COUNT: '1',
};

const androidOnlyPR = {
  ...bothPlatformsPR,
  IOS_COUNT: '0',
  IOS_OR_IGNORABLE_COUNT: '0',
};

describe('run-compute-e2e-platform-flags entrypoint', () => {
  describe('pull requests targeting main', () => {
    it('emits ios_final=false and explains the suppression exactly once', () => {
      const { status, stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        ...bothPlatformsPR,
      });

      expect(status).toBe(0);
      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'false',
        e2e_needed: 'true',
        use_main_builds_for_test_only_prs: 'false',
      });
      expect(stdout).toContain('iOS not requested for this PR');
    });

    it('skips fork PRs', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        IS_FORK: 'true',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'false',
        ios_final: 'false',
        e2e_needed: 'false',
        run_smart_e2e_selection: 'false',
      });
      expect(stdout).toContain('Skipping E2E (fork PR)');
    });

    it('skips hard E2E signals', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        SHOULD_SKIP_E2E: 'true',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'false',
        ios_final: 'false',
        e2e_needed: 'false',
        run_smart_e2e_selection: 'false',
      });
      expect(stdout).toContain('Skipping E2E (skip signal)');
    });

    it('emits merge blocking for non-ignorable readiness labels', () => {
      const { outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        LABEL_BLOCKS_MERGE: 'true',
        ...bothPlatformsPR,
      });

      expect(outputs.block_merge).toBe('true');
    });

    it('does not block merge for ignorable-only changes', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        LABEL_BLOCKS_MERGE: 'true',
        ...bothPlatformsPR,
        IGNORABLE_COUNT: '1',
        E2E_TEST_FILES_COUNT: '0',
        E2E_TEST_OR_IGNORABLE_COUNT: '1',
      });

      expect(outputs.block_merge).toBe('false');
      expect(stdout).toContain('BLOCK_MERGE bypassed');
    });

    it('emits run_performance for the performance label', () => {
      const { outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        RUN_PERFORMANCE_LABEL: 'true',
        ...bothPlatformsPR,
      });

      expect(outputs.run_performance).toBe('true');
    });

    it('builds iOS and runs Appium iOS when run-appium-ios-tests is applied', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        RUN_APPIUM_IOS_LABEL: 'true',
        ...androidOnlyPR,
      });

      // The label widens to iOS even on an Android-only PR.
      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
        use_main_builds_for_test_only_prs: 'false',
      });
      expect(stdout).toContain('run-appium-ios-tests label');
    });

    it('builds both platforms and runs Appium iOS with skip-smart-e2e-selection', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        SKIP_SMART_SELECTION: 'true',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
      });
      expect(stdout).toContain('skip-smart-e2e-selection label');
    });

    it('widens skip-smart-e2e-selection to both platforms on an Android-only PR', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        SKIP_SMART_SELECTION: 'true',
        ...androidOnlyPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
      });
    });

    it('enables iOS for smoke-infrastructure changes on main', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        E2E_SMOKE_INFRA_COUNT: '3',
        ...androidOnlyPR,
      });

      expect(outputs.ios_final).toBe('true');
      expect(stdout).toContain('e2e smoke infrastructure changes');
    });

    it('leaves no E2E to run for an iOS-only PR', () => {
      const { outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        ...bothPlatformsPR,
        ANDROID_COUNT: '0',
        ANDROID_OR_IGNORABLE_COUNT: '0',
      });

      expect(outputs).toMatchObject({
        android_final: 'false',
        ios_final: 'false',
        e2e_needed: 'false',
        use_main_builds_for_test_only_prs: 'false',
        run_smart_e2e_selection: 'false',
      });
    });
  });

  describe('pull requests targeting release/*', () => {
    it('opts into iOS via run-appium-ios-tests', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'release/1.0.0',
        RUN_APPIUM_IOS_LABEL: 'true',
        ...androidOnlyPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
      });
      expect(stdout).toContain('run-appium-ios-tests label');
      expect(stdout).not.toContain('iOS build disabled for PRs into main');
    });

    it('suppresses iOS without an explicit request on release/* PRs', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'release/1.0.0',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'false',
      });
      expect(stdout).not.toContain('e2e smoke infrastructure changes');
    });

    it('does not apply the smoke-infrastructure exception on release/* PRs', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'release/1.0.0',
        E2E_SMOKE_INFRA_COUNT: '3',
        ...androidOnlyPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'false',
      });
      expect(stdout).not.toContain('e2e smoke infrastructure changes');
    });
  });

  describe('non-pull-request events', () => {
    it('skips E2E for merge queue events', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'merge_group',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'false',
        ios_final: 'false',
        e2e_needed: 'false',
      });
      expect(stdout).toContain('Skipping E2E (merge queue)');
    });

    it('builds both platforms for a shared app push', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'push',
        GITHUB_REF: 'refs/heads/main',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
        e2e_needed: 'true',
      });
      expect(stdout).not.toContain('iOS build disabled for PRs into main');
    });

    it('skips ignorable-only pushes to main', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'push',
        GITHUB_REF: 'refs/heads/main',
        ...bothPlatformsPR,
        IGNORABLE_COUNT: '1',
        E2E_TEST_FILES_COUNT: '0',
        E2E_TEST_OR_IGNORABLE_COUNT: '1',
      });

      expect(outputs).toMatchObject({
        android_final: 'false',
        ios_final: 'false',
        e2e_needed: 'false',
      });
      expect(stdout).toContain('ignorable-only changes');
    });

    it('runs full E2E for every push to release/*', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'push',
        GITHUB_REF: 'refs/heads/release/1.0.0',
        ...bothPlatformsPR,
        IGNORABLE_COUNT: '1',
        E2E_TEST_FILES_COUNT: '0',
        E2E_TEST_OR_IGNORABLE_COUNT: '1',
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
        e2e_needed: 'true',
      });
      expect(stdout).toContain('push to release/*');
    });
  });
});
