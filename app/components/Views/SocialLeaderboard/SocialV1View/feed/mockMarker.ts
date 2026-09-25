/**
 * Suffix appended to any label whose value the client invented, so the feed
 * reads honestly while the API catches up: real activity, flagged enrichment.
 */
export const MOCK_MARKER = '*';

/**
 * Every field the V1 feed can fabricate. Carried on the item alongside the
 * marked labels so tests (and later, cleanup) can assert what is invented
 * without string-matching the rendered copy.
 */
export type SocialV1MockedField = 'markPrice' | 'autoClose';

/**
 * Appends the mock marker to an already-formatted label. Applied at format
 * time so the marker travels with the value instead of being re-derived in UI
 * branches -- with one exception: `winRatePercent` stays a number on the item
 * because `WinRateTag` is shared with the leaderboard, so that tag takes an
 * `isMocked` flag instead.
 */
export const markMocked = (label: string): string => `${label}${MOCK_MARKER}`;
