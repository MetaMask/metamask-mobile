import {
  partitionRetryableBlockerCascadeJobs,
  type FailureCategory,
} from './failure-classification.mts';

const categories: Record<string, FailureCategory> = {
  'Appium Smoke Tests': 'alwaysRetryable',
  'Unit tests (1)': 'retryableOnTransientError',
  'Totally New CI Job': 'retryableOnTransientError',
};

const jobs = Object.keys(categories).map((name) => ({ name }));
const getCategory = (jobName: string): FailureCategory => categories[jobName];

describe('partitionRetryableBlockerCascadeJobs', () => {
  it('classifies always-retryable jobs and cascades the rest', () => {
    const { jobsToClassify, jobsToCascade } =
      partitionRetryableBlockerCascadeJobs({ jobs, getCategory });

    expect(jobsToClassify.map((job) => job.name)).toEqual([
      'Appium Smoke Tests',
    ]);
    expect(jobsToCascade.map((job) => job.name)).toEqual([
      'Unit tests (1)',
      'Totally New CI Job',
    ]);
  });

  it('classifies an unmatched job instead of cascading it', () => {
    const { jobsToClassify, jobsToCascade } =
      partitionRetryableBlockerCascadeJobs({
        jobs,
        getCategory,
        isUnmatched: (jobName) => jobName === 'Totally New CI Job',
      });

    expect(jobsToClassify.map((job) => job.name)).toEqual([
      'Appium Smoke Tests',
      'Totally New CI Job',
    ]);
    expect(jobsToCascade.map((job) => job.name)).toEqual(['Unit tests (1)']);
  });
});
