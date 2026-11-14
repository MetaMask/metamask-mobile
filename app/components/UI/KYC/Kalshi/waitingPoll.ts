/** Reads at the quick pace before the pace slows down. */
const QUICK_READS = 12;
/** Reads at the middle pace before the pace slows down again. */
const MIDDLE_READS = 24;

const QUICK_DELAY_MS = 5000;
const MIDDLE_DELAY_MS = 15000;
const SLOW_DELAY_MS = 30000;

/**
 * How long to wait before the next step read while kyc-api waits for a
 * verification decision. Every read makes kyc-api read the idOS relay, so the
 * pace slows down: every 5 seconds for the first minute, every 15 seconds for
 * the next six minutes, then every 30 seconds.
 *
 * @param readsSoFar - How many reads this wait has made.
 * @returns The delay in milliseconds.
 */
export const nextWaitingPollDelayMs = (readsSoFar: number): number => {
  if (readsSoFar < QUICK_READS) {
    return QUICK_DELAY_MS;
  }
  if (readsSoFar < QUICK_READS + MIDDLE_READS) {
    return MIDDLE_DELAY_MS;
  }
  return SLOW_DELAY_MS;
};
