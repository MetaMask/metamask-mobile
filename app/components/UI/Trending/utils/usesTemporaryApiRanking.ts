const TEMPORARY_API_RANKED_SEARCH_TERM = 'laptop';
const MINIMUM_SEARCH_PREFIX_LENGTH = 4;

/**
 * TEMPORARY: Remove after the LAPTOP launch.
 *
 * Returns whether token search should preserve API ranking for the LAPTOP
 * launch. An optional ticker-style "$" prefix is ignored, and prefixes from
 * "lapt" onward are included to avoid changing order on the final keystroke.
 *
 * @param query - Token search query.
 * @param isEnabled - Remote kill switch. Defaults to true.
 * @returns Whether API ranking should be preserved.
 */
export const usesTemporaryApiRanking = (
  query?: string,
  isEnabled = true,
): boolean => {
  if (!isEnabled) {
    return false;
  }

  const normalizedQuery = query?.trim().toLowerCase().replace(/^\$/, '');

  if (
    !normalizedQuery ||
    normalizedQuery.length < MINIMUM_SEARCH_PREFIX_LENGTH
  ) {
    return false;
  }

  return (
    TEMPORARY_API_RANKED_SEARCH_TERM.startsWith(normalizedQuery) ||
    normalizedQuery.includes(TEMPORARY_API_RANKED_SEARCH_TERM)
  );
};
