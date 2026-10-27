import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const PLANNER = path.join(__dirname, 'plan-ota-pull-request.mts');

const WORKFLOW = path.join(
  __dirname,
  '../workflows/runway-ota-resolve-context.yml',
);

function filterFromWorkflow(): string {
  const yaml = readFileSync(WORKFLOW, 'utf8');
  const match = yaml.match(/SELECT_OTA_PR='([^']+)'/);
  if (!match) {
    throw new Error('SELECT_OTA_PR filter is missing from runway-ota-resolve-context.yml');
  }
  return match[1];
}

function select(prs: { number: number; baseRefName: string }[]): string {
  return execFileSync('jq', ['-r', filterFromWorkflow()], {
    encoding: 'utf8',
    input: JSON.stringify(prs),
  }).trim();
}

function plannerNumber(
  prs: { number: number; baseRefName: string; state: string; title: string }[],
): number {
  const stdout = execFileSync(process.execPath, [PLANNER], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PRS_JSON: JSON.stringify(prs),
      DESIRED_BASE: 'ota-base/v8.15.0',
      SEMVER: '8.15.1',
    },
  });
  return (JSON.parse(stdout) as { prNumber: number }).prNumber;
}

describe('OTA pull request selection', () => {
  it('prefers an ota-base pull request over a stable one', () => {
    expect(
      select([
        { number: 9, baseRefName: 'stable' },
        { number: 4, baseRefName: 'ota-base/v8.15.0' },
      ]),
    ).toBe('4');
  });

  it('keeps the only open pull request when it still targets stable', () => {
    expect(select([{ number: 9, baseRefName: 'stable' }])).toBe('9');
  });

  it('returns an empty string when there is no open pull request', () => {
    expect(select([])).toBe('');
  });

  it('picks the lowest number when gh lists a newer ota-base pull request first', () => {
    const prs = [
      {
        number: 11,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
      {
        number: 4,
        baseRefName: 'ota-base/v8.15.0',
        state: 'OPEN',
        title: 'release: 8.15.1 (OTA)',
      },
    ];

    expect(select(prs)).toBe('4');
    expect(plannerNumber(prs)).toBe(4);
  });
});
