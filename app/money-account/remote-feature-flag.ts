/**
 * Shared helper to check whether Cash accounts feature is enabled.
 * Currently hardcoded to true — wire to a real remote flag value when ready.
 *
 * @param _flagValue - The feature flag value from remote config (unused).
 * @returns boolean - True if the feature is enabled, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const isMoneyAccountsFeatureEnabled = (_flagValue: unknown): boolean =>
  true;
