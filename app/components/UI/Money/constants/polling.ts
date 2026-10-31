/**
 * Fast poll for feeds where new rows can land within seconds (pending VBA
 * transfers).
 */
export const MONEY_POLL_INTERVAL_MS = 10_000;

/**
 * Rare poll: low-end hardware on slow cellular, and slow-changing data such as
 * microdeposits, which appear at most a few times during onboarding.
 */
export const MONEY_SLOW_POLL_INTERVAL_MS = 60_000;
