import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENTRYPOINT = path.join(
  __dirname,
  'run-compute-e2e-platform-flags.cjs',
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
        native_build_needed: 'true',
        run_appium_ios: 'false',
      });
      expect(stdout).toContain('iOS not requested for a PR into main');
      expect(stdout).toContain(
        '-> RUN_APPIUM_IOS=false — iOS not requested for this PR into main.',
      );
      // The log must never contradict the emitted output.
      expect(stdout).not.toContain('RUN_APPIUM_IOS=true');
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
        run_appium_ios: 'true',
        native_build_needed: 'true',
      });
      expect(stdout).toContain(
        "-> RUN_APPIUM_IOS=true due to 'run-appium-ios-tests' label on PR",
      );
    });

    it('builds iOS and runs Appium iOS when skip-smart-e2e-selection is applied and paths require iOS', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        SKIP_SMART_SELECTION: 'true',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
        run_appium_ios: 'true',
      });
      expect(stdout).toContain(
        "-> RUN_APPIUM_IOS=true due to 'skip-smart-e2e-selection' label on PR (iOS already required by path filters)",
      );
    });

    it('keeps skip-smart-e2e-selection non-widening on an Android-only PR', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        SKIP_SMART_SELECTION: 'true',
        ...androidOnlyPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'false',
        run_appium_ios: 'false',
      });
      expect(stdout).not.toContain('RUN_APPIUM_IOS=true');
    });

    it('does not claim an Appium iOS run for smoke-infra changes', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'main',
        E2E_SMOKE_INFRA_COUNT: '3',
        ...androidOnlyPR,
      });

      expect(outputs.run_appium_ios).toBe('false');
      expect(outputs.ios_final).toBe('false');
      expect(stdout).not.toContain('RUN_APPIUM_IOS=true');
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
        native_build_needed: 'false',
        run_smart_e2e_selection: 'false',
        run_appium_ios: 'false',
      });
    });
  });

  describe('pull requests targeting release/*', () => {
    it('still opts into iOS and Appium iOS via run-appium-ios-tests', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'release/1.0.0',
        RUN_APPIUM_IOS_LABEL: 'true',
        ...androidOnlyPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
        run_appium_ios: 'true',
      });
      expect(stdout).toContain(
        "-> RUN_APPIUM_IOS=true due to 'run-appium-ios-tests' label on PR",
      );
      expect(stdout).not.toContain('iOS build disabled for PRs into main');
    });

    it('still enables Appium iOS via skip-smart-e2e-selection when paths require iOS', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'pull_request',
        PR_BASE_REF: 'release/1.0.0',
        SKIP_SMART_SELECTION: 'true',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
        run_appium_ios: 'true',
      });
      expect(stdout).toContain(
        "-> RUN_APPIUM_IOS=true due to 'skip-smart-e2e-selection' label on PR (iOS already required by path filters)",
      );
    });
  });

  describe('non-pull-request events', () => {
    it('builds both platforms on a push and emits no main-PR suppression log', () => {
      const { stdout, outputs } = runEntrypoint({
        GITHUB_EVENT_NAME: 'push',
        ...bothPlatformsPR,
      });

      expect(outputs).toMatchObject({
        android_final: 'true',
        ios_final: 'true',
        e2e_needed: 'true',
        run_appium_ios: 'false',
      });
      expect(stdout).not.toContain('iOS build disabled for PRs into main');
      expect(stdout).not.toContain('RUN_APPIUM_IOS=true');
    });
  });
});
