import { execFileSync, spawnSync } from 'child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const SCRIPT = path.join(__dirname, 'ensure-ota-pull-request.sh');

function runWithFakeGh(options: {
  prs: unknown[];
  labels?: string;
  planOnly?: boolean;
  allowCreate?: boolean;
  otaVersion?: string;
  changelog?: string;
}): { exitCode: number; stdout: string; stderr: string; log: string; output: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'ota-pr-'));
  const bin = path.join(root, 'bin');
  const log = path.join(root, 'gh.log');
  const output = path.join(root, 'github.output');
  execFileSync('mkdir', ['-p', bin]);
  writeFileSync(
    path.join(bin, 'gh'),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_LOG"
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  printf '%s\\n' "$GH_PRS_JSON"
  exit 0
fi
if [[ "$1" == "pr" && "$2" == "view" ]]; then
  printf '%s\\n' "\${GH_LABELS:-}"
  exit 0
fi
if [[ "$1" == "pr" && "$2" == "create" ]]; then
  printf '%s\\n' "https://github.com/MetaMask/metamask-mobile/pull/77"
  exit 0
fi
exit 0
`,
  );
  chmodSync(path.join(bin, 'gh'), 0o755);
  writeFileSync(output, '');
  const otaFile = path.join(root, 'ota.ts');
  writeFileSync(
    otaFile,
    `export const OTA_VERSION: string = '${options.otaVersion ?? 'v8.15.1'}';\n`,
  );
  const changelogFile = path.join(root, 'CHANGELOG.md');
  writeFileSync(changelogFile, options.changelog ?? '# Changelog\n');

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH ?? ''}`,
    GH_LOG: log,
    GH_PRS_JSON: JSON.stringify(options.prs),
    GH_LABELS: options.labels ?? '',
    HEAD_BRANCH: 'release/8.15.1-ota',
    DESIRED_BASE: 'ota-base/v8.15.0',
    SEMVER: '8.15.1',
    GITHUB_REPOSITORY: 'MetaMask/metamask-mobile',
    GH_TOKEN: 'test-token',
    GITHUB_OUTPUT: output,
    PLAN_ONLY: options.planOnly ? 'true' : '',
    ALLOW_CREATE: options.allowCreate === false ? 'false' : 'true',
    OTA_CONSTANTS_FILE: otaFile,
    CHANGELOG_FILE: changelogFile,
  };

  const ran = spawnSync('bash', [SCRIPT], { encoding: 'utf8', env });
  const exitCode = ran.status ?? 1;
  const stdout = ran.stdout ?? '';
  const stderr = ran.stderr ?? '';

  const ghLog = readFileSync(log, 'utf8');
  const githubOutput = readFileSync(output, 'utf8');
  rmSync(root, { recursive: true, force: true });
  return { exitCode, stdout, stderr, log: ghLog, output: githubOutput };
}

describe('ensure-ota-pull-request.sh', () => {
  it('retargets a stable OTA pull request and reopens it for CI', () => {
    const result = runWithFakeGh({
      prs: [
        {
          number: 7,
          baseRefName: 'stable',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
      ],
      labels: 'pr-not-ready-for-e2e',
    });

    expect(result.exitCode).toBe(0);
    expect(result.log).toContain('pr edit 7');
    expect(result.log).toContain('--base ota-base/v8.15.0');
    expect(result.log).toContain('--remove-label pr-not-ready-for-e2e');
    expect(result.log).toContain('pr close 7');
    expect(result.log).toContain('pr reopen 7');
    expect(result.output).toContain('skip_bump=true');
  });

  it('removes pr-not-ready-for-e2e when the pull request is created', () => {
    const result = runWithFakeGh({
      prs: [],
      labels: 'pr-not-ready-for-e2e',
    });

    expect(result.exitCode).toBe(0);
    expect(result.log).toContain('pr create');
    expect(result.log).toContain('pr view 77');
    expect(result.log).toContain('--remove-label pr-not-ready-for-e2e');
    expect(result.log).toContain('pr close 77');
    expect(result.log).toContain('pr reopen 77');
  });

  it('does not skip the bump when the pull request exists and OTA_VERSION is the sentinel', () => {
    const opened = runWithFakeGh({ prs: [], otaVersion: 'vX.XX.X' });
    const rerun = runWithFakeGh({
      planOnly: true,
      otaVersion: 'vX.XX.X',
      prs: [
        {
          number: 77,
          baseRefName: 'ota-base/v8.15.0',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
      ],
    });

    expect(opened.exitCode).toBe(0);
    expect(opened.output).toContain('pr_action=create');
    expect(opened.output).toContain('skip_bump=false');
    expect(rerun.exitCode).toBe(0);
    expect(rerun.output).toContain('pr_action=use');
    expect(rerun.output).toContain('skip_bump=false');
    expect(rerun.stderr).toContain('vX.XX.X');
  });

  it('runs the changelog when the pull request exists, the version is bumped, and the section is missing', () => {
    const result = runWithFakeGh({
      planOnly: true,
      otaVersion: 'v8.15.1',
      changelog: '# Changelog\n\n## [8.14.0]\n',
      prs: [
        {
          number: 4,
          baseRefName: 'ota-base/v8.15.0',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('pr_action=use');
    expect(result.output).toContain('skip_bump=true');
    expect(result.output).toContain('skip_changelog=false');
    expect(result.stderr).toContain('changelog still runs');
  });

  it('corrects a stale OTA_VERSION when the pull request already exists', () => {
    const result = runWithFakeGh({
      planOnly: true,
      otaVersion: 'v8.14.1',
      prs: [
        {
          number: 4,
          baseRefName: 'ota-base/v8.15.0',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('skip_bump=false');
    expect(result.output).toContain('skip_changelog=false');
  });

  it('skips the changelog when the semver section is already present', () => {
    const result = runWithFakeGh({
      planOnly: true,
      otaVersion: 'v8.15.1',
      changelog: '# Changelog\n\n## [8.15.1]\n',
      prs: [
        {
          number: 4,
          baseRefName: 'ota-base/v8.15.0',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('skip_bump=true');
    expect(result.output).toContain('skip_changelog=true');
  });

  it('opens a draft pull request against the pinned base', () => {
    const result = runWithFakeGh({ prs: [] });

    expect(result.exitCode).toBe(0);
    expect(result.log).toContain('pr create');
    expect(result.log).toContain('--draft');
    expect(result.log).toContain('--base ota-base/v8.15.0');
    expect(result.log).toContain('--head release/8.15.1-ota');
    expect(result.output).toContain('skip_bump=false');
  });

  it('closes a leftover stable pull request without retargeting the pinned one', () => {
    const result = runWithFakeGh({
      prs: [
        {
          number: 4,
          baseRefName: 'ota-base/v8.15.0',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
        {
          number: 9,
          baseRefName: 'stable',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.log).not.toContain('--base ota-base/v8.15.0');
    expect(result.log).toContain('pr close 9');
    expect(result.log).not.toContain('pr close 4');
  });

  it('does not open a pull request when creation is deferred', () => {
    const result = runWithFakeGh({ prs: [], allowCreate: false });

    expect(result.exitCode).toBe(0);
    expect(result.log).not.toContain('pr create');
    expect(result.stderr).toContain('Leaving creation');
    expect(result.output).toContain('skip_bump=false');
  });

  it('does not edit the pull request when only planning', () => {
    const result = runWithFakeGh({
      planOnly: true,
      prs: [
        {
          number: 7,
          baseRefName: 'stable',
          state: 'OPEN',
          title: 'release: 8.15.1 (OTA)',
        },
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"action":"retarget"');
    expect(result.log).not.toContain('pr edit');
    expect(result.log).not.toContain('pr create');
    expect(result.output).toContain('skip_bump=true');
  });
});
