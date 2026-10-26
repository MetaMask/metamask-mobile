import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

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
});
