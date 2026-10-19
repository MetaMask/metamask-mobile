/**
 * Largest value we treat as a seconds-based timestamp. `1e12` ms is 2001-09-09,
 * so anything below it cannot be a plausible millisecond timestamp for trade
 * data and is therefore a seconds value.
 */
const MAX_SECONDS_TIMESTAMP = 1e12;

/**
 * Normalizes a trade timestamp to milliseconds.
 *
 * The social API returns trade timestamps in seconds on some payloads and
 * milliseconds on others, so every consumer has to normalize before doing date
 * math. Non-positive values are passed through untouched — they are already
 * invalid, and scaling them would turn a sentinel `0`/negative into a
 * different-but-still-wrong instant.
 */
export const tradeTimestampToMs = (timestamp: number): number =>
  timestamp > 0 && timestamp < MAX_SECONDS_TIMESTAMP
    ? timestamp * 1000
    : timestamp;
