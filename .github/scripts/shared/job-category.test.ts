import { readFileSync } from 'node:fs';
import path from 'node:path';

import { stripJsonComments } from './json-tools.mts';

type Category = 'alwaysRetryable' | 'retryableOnTransientError' | 'optional';

const categoryOrder: Category[] = [
  'alwaysRetryable',
  'retryableOnTransientError',
  'optional',
];

const config = JSON.parse(
  stripJsonComments(
    readFileSync(
      path.join(__dirname, '../../rules/retry-config.jsonc'),
      'utf8',
    ),
  ),
) as {
  jobClassification: Record<Category, { patterns: string[] }>;
};

function categoryFor(jobName: string): Category | undefined {
  for (const category of categoryOrder) {
    for (const pattern of config.jobClassification[category].patterns) {
      if (new RegExp(pattern, 'i').test(jobName)) {
        return category;
      }
    }
  }
  return undefined;
}

describe('job classification patterns', () => {
  it.each([
    ['Report Fixture Validation', 'retryableOnTransientError'],
    ['Ship JS bundle size check', 'retryableOnTransientError'],
    ['Run Performance Tests (PR)', 'retryableOnTransientError'],
    ['merge-unit-and-component-view-tests', 'retryableOnTransientError'],
    ['Delete CI JS deps artifact', 'optional'],
    ['Deploy Platform API Docs', 'optional'],
  ] as const)('lists %s as %s', (jobName, category) => {
    expect(categoryFor(jobName)).toBe(category);
  });

  it('leaves a job with no pattern unmatched', () => {
    expect(categoryFor('Totally New CI Job')).toBeUndefined();
  });
});
