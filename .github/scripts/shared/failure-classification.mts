export type FailureCategory = "alwaysRetryable" | "retryableOnTransientError" | "optional";

export type FailureJob = {
  name: string;
};

export function partitionRetryableBlockerCascadeJobs<JobType extends FailureJob>({
  jobs,
  getCategory,
  isUnmatched = () => false,
}: {
  jobs: JobType[];
  getCategory: (jobName: string) => FailureCategory;
  isUnmatched?: (jobName: string) => boolean;
}): {
  jobsToClassify: JobType[];
  jobsToCascade: JobType[];
} {
  return jobs.reduce<{
    jobsToClassify: JobType[];
    jobsToCascade: JobType[];
  }>(
    (partition, job) => {
      // Always-retryable jobs (E2E) are classified individually even when a
      // blocker failed transiently. Unmatched jobs are classified individually
      // too, so they stay non-retryable instead of inheriting the blocker's
      // retry. Other jobs cascade with the blocker.
      if (isUnmatched(job.name) || getCategory(job.name) === "alwaysRetryable") {
        partition.jobsToClassify.push(job);
      } else {
        partition.jobsToCascade.push(job);
      }
      return partition;
    },
    { jobsToClassify: [], jobsToCascade: [] },
  );
}
