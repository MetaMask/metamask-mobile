export type FailureCategory = "alwaysRetryable" | "retryableOnTransientError" | "optional";

export type FailureJob = {
  name: string;
};

export function partitionRetryableBlockerCascadeJobs<JobType extends FailureJob>({
  jobs,
  getCategory,
}: {
  jobs: JobType[];
  getCategory: (jobName: string) => FailureCategory;
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
      // blocker failed transiently. Other jobs cascade with the blocker.
      if (getCategory(job.name) === "alwaysRetryable") {
        partition.jobsToClassify.push(job);
      } else {
        partition.jobsToCascade.push(job);
      }
      return partition;
    },
    { jobsToClassify: [], jobsToCascade: [] },
  );
}
