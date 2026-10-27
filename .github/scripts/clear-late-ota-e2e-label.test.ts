import { execFileSync, spawnSync } from 'child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const SCRIPT = path.join(__dirname, 'clear-late-ota-e2e-label.sh');
const WORKFLOW = path.join(__dirname, '../workflows/ensure-ota-release-pr.yml');

function run(options: {
  prs?: unknown[];
  event?: unknown;
  labels?: string;
}): { exitCode: number; stderr: string; log: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'ota-label-'));
  const bin = path.join(root, 'bin');
  const log = path.join(root, 'gh.log');
  execFileSync('mkdir', ['-p', bin]);
  writeFileSync(log, '');
  writeFileSync(
    path.join(bin, 'gh'),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_LOG"
if [[ "$1" == "pr" && "$2" == "view" ]]; then
  printf '%s\\n' "\${GH_LABELS:-}"
fi
exit 0
`,
  );
  chmodSync(path.join(bin, 'gh'), 0o755);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH ?? ''}`,
    GH_LOG: log,
    GH_LABELS: options.labels ?? '',
    GH_TOKEN: 'test-token',
    GITHUB_REPOSITORY: 'MetaMask/metamask-mobile',
  };
  delete env.GITHUB_EVENT_PATH;
  delete env.PRS_JSON;

  if (options.event) {
    const eventPath = path.join(root, 'event.json');
    writeFileSync(eventPath, JSON.stringify(options.event));
    env.GITHUB_EVENT_PATH = eventPath;
  } else {
    env.PRS_JSON = JSON.stringify(options.prs ?? []);
  }

  const ran = spawnSync('bash', [SCRIPT], { encoding: 'utf8', env });
  const ghLog = readFileSync(log, 'utf8');
  rmSync(root, { recursive: true, force: true });
  return { exitCode: ran.status ?? 1, stderr: ran.stderr ?? '', log: ghLog };
}

describe('clear-late-ota-e2e-label.sh', () => {
  it('removes a late pr-not-ready-for-e2e label and reopens the OTA pull request', () => {
    const result = run({
      event: {
        workflow_run: {
          pull_requests: [{ number: 77, base: { ref: 'ota-base/v8.15.0' } }],
        },
      },
      labels: 'pr-not-ready-for-e2e',
    });

    expect(result.exitCode).toBe(0);
    expect(result.log).toContain('pr view 77');
    expect(result.log).toContain('--remove-label pr-not-ready-for-e2e');
    expect(result.log).toContain('pr close 77');
    expect(result.log).toContain('pr reopen 77');
  });

  it('leaves a pull request that is not targeting ota-base', () => {
    const result = run({
      prs: [{ number: 12, baseRef: 'main' }],
      labels: 'pr-not-ready-for-e2e',
    });

    expect(result.exitCode).toBe(0);
    expect(result.log).not.toContain('pr view');
    expect(result.log).not.toContain('pr close');
  });

  it('does not reopen an OTA pull request that does not have the label', () => {
    const result = run({
      prs: [{ number: 77, baseRef: 'ota-base/v8.15.0' }],
      labels: '',
    });

    expect(result.exitCode).toBe(0);
    expect(result.log).toContain('pr view 77');
    expect(result.log).not.toContain('--remove-label');
    expect(result.log).not.toContain('pr reopen');
  });
});

function getTokenWithBlocks(yaml: string): string[] {
  const lines = yaml.split('\n');
  const blocks: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].includes('actions/get-token@')) {
      continue;
    }
    const chunk: string[] = [];
    for (let next = index + 1; next < lines.length; next++) {
      if (/^\s+- name:/.test(lines[next]) || /^  [a-z0-9-]+:\s*$/.test(lines[next])) {
        break;
      }
      chunk.push(lines[next]);
    }
    blocks.push(chunk.join('\n'));
  }
  return blocks;
}

function permissionLines(block: string): string[] {
  const lines = block.split('\n');
  const start = lines.findIndex((line) => line.includes('permissions: |'));
  if (start === -1) {
    return [];
  }
  const pairs: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) {
      break;
    }
    pairs.push(line.trim());
  }
  return pairs;
}

describe('ensure-ota-release-pr.yml late label job', () => {
  it('gives get-token newline-separated permissions and no repositories input', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');
    const blocks = getTokenWithBlocks(workflow);

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain('permissions: |');
      expect(block).not.toMatch(/^\s*repositories:/m);
      expect(block).not.toMatch(/permissions:\s*['"]?\{/);
      const pairs = permissionLines(block);
      expect(pairs.length).toBeGreaterThan(0);
      for (const pair of pairs) {
        expect(pair).toMatch(/^[a-z_]+: (read|write)$/);
      }
    }

    const clearJob = workflow.slice(workflow.indexOf('clear-late-e2e-label:'));
    const clearPermissions = permissionLines(getTokenWithBlocks(clearJob)[0] ?? '');
    expect(clearPermissions).toEqual(['contents: read', 'pull_requests: write']);
  });

  it('runs the clearer after the auto-label workflow succeeds', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');

    expect(workflow).toContain('Auto-apply pr-not-ready-for-e2e label');
    expect(workflow).toContain('clear-late-ota-e2e-label.sh');
    expect(workflow).toContain(
      "github.event.workflow_run.name == 'Auto-apply pr-not-ready-for-e2e label'",
    );
    expect(workflow).toContain("endsWith(github.event.workflow_run.head_branch, '-ota')");
  });
});
