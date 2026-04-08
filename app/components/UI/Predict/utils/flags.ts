/**
 * Generic utility to unwrap a remote feature flag from either of two runtime shapes:
 *
 * 1) Direct shape (flag value is the object itself):
 * { enabled: true, minimumVersion: '7.65.0', variant: 'list' }
 *
 * 2) Progressive rollout / A/B test shape (flag value is nested inside `.value`):
 * { name: 'group-a', value: { enabled: true, minimumVersion: '7.65.0', variant: 'list' } }
 *
 * This function only normalizes the shape — it does NOT validate version gating.
 * Use `validatedVersionGatedFeatureFlag()` separately for version checks.
 *
 * Works for any flag type, including non-version-gated flags like PredictFeeCollection.
 *
 * @param remoteFlag - The raw remote feature flag value (unknown shape)
 * @returns The unwrapped flag value typed as T, or undefined if the input is not a valid object
 */
export function unwrapRemoteFeatureFlag<T>(remoteFlag: unknown): T | undefined {
  if (typeof remoteFlag !== 'object' || remoteFlag === null) {
    return undefined;
  }

  // Direct shape: if the object has an `enabled` property, treat it as the flag itself.
  // This check runs first to avoid misinterpreting a direct-shape flag that happens
  // to have a `value` property as a progressive rollout wrapper.
  if ('enabled' in remoteFlag) {
    return remoteFlag as T;
  }

  // Progressive rollout shape: extract the nested value
  if ('value' in remoteFlag) {
    const wrapped = (remoteFlag as { value?: unknown }).value;
    if (typeof wrapped === 'object' && wrapped !== null) {
      return wrapped as T;
    }
    return undefined;
  }

  return undefined;
}
