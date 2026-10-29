/**
 * Suffix appended to any label whose value the client invented, so the feed
 * reads honestly while the API catches up: real activity, flagged enrichment.
 */
export const MOCK_MARKER = '*';

/**
 * Appends the mock marker to an already-formatted label. `WinRateTag` is
 * shared with the leaderboard, so it takes an `isMocked` flag and marks its
 * label here.
 */
export const markMocked = (label: string): string => `${label}${MOCK_MARKER}`;
