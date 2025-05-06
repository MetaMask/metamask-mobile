/**
 * Gets the feature flag value from the environment variable
 * @param {string | undefined} envValue - The environment variable value
 * @param {boolean} remoteValue - The remote value
 * @returns {boolean} The feature flag value
 */
export function getFeatureFlagValue(
  envValue: string | undefined,
  remoteValue: boolean,
): boolean {
  if (envValue === 'true') {
    return true;
  }
  if (envValue === 'false') {
    return false;
  }
  return remoteValue;
}
