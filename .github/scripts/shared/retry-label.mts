/**
 * retry-label.mts
 *
 * Helpers for the retry-ci label check in classify-failures.mts. Kept free of
 * side effects so the pagination behavior can be unit tested.
 */

export const RETRY_LABEL = 'retry-ci';

/**
 * Labels endpoint for one PR. The page size is raised to the API maximum, and
 * the caller must pass `paginate: true` so later pages are read as well.
 */
export function labelsPath(repoApi: string, prNumber: string): string {
  return `${repoApi}/issues/${prNumber}/labels?per_page=100`;
}

/**
 * `labelNames` is the output of `gh api --paginate --jq '.[].name'`: one label
 * name per line, across every page. Matches the whole name, not a substring.
 */
export function hasRetryLabel(labelNames: string): boolean {
  return labelNames
    .split('\n')
    .some((name) => name.trim() === RETRY_LABEL);
}
