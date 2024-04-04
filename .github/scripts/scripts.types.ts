/**
 * Pull request trigger types that we use in our scripts
 * Expose more types as needed
 */
export enum PullRequestTriggerType {
  ReadyForReview = 'ready_for_review',
  Labeled = 'labeled',
}

/**
 * Status for status checks that we use in our scripts
 * Expose more types as needed
 */
export enum StatusCheckStatusType {
  InProgress = 'in_progress',
  Completed = 'completed',
}

/**
 * Conclusion for status checks that we use in our scripts
 * Expose more types as needed
 */
export enum CompletedConclusionType {
  Success = 'success',
  Failure = 'failure',
  Skipped = 'skipped',
}
