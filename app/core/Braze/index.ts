import Logger from '../../util/Logger';
import { isE2E } from '../../util/test/utils';
import Engine from '../Engine/Engine';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';

let brazePlugin: BrazePlugin | undefined;

/**
 * Get or create the singleton BrazePlugin instance.
 * This should be called during analytics controller initialization to pass
 * the plugin to the platform adapter.
 */
export function getBrazePlugin(): BrazePlugin {
  brazePlugin ??= new BrazePlugin();
  return brazePlugin;
}

/**
 * Validate that a remote flag value has the expected BrazeAllowedConfig shape.
 *
 * @param value - The raw flag value from RemoteFeatureFlagController.
 * @returns Validated allowedEvents/allowedTraits arrays, or undefined.
 */
function validateBrazeAllowedConfig(
  value: unknown,
): { allowedEvents?: string[]; allowedTraits?: string[] } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const result: { allowedEvents?: string[]; allowedTraits?: string[] } = {};

  if (
    Array.isArray(record.allowedEvents) &&
    record.allowedEvents.every((e: unknown) => typeof e === 'string')
  ) {
    result.allowedEvents = record.allowedEvents as string[];
  }

  if (
    Array.isArray(record.allowedTraits) &&
    record.allowedTraits.every((t: unknown) => typeof t === 'string')
  ) {
    result.allowedTraits = record.allowedTraits as string[];
  }

  return result.allowedEvents || result.allowedTraits ? result : undefined;
}

/**
 * Update the Braze plugin allowlists from a remote feature flag value.
 * Called by analytics-controller-init on startup and on flag updates.
 *
 * @param flagValue - The raw remote feature flag value for brazeAllowedConfig.
 */
export function syncBrazeAllowlists(flagValue: unknown): void {
  try {
    const brazeConfig = validateBrazeAllowedConfig(flagValue);
    if (!brazeConfig) {
      return;
    }

    const plugin = getBrazePlugin();
    if (brazeConfig.allowedEvents) {
      plugin.setAllowedEvents(brazeConfig.allowedEvents);
    }
    if (brazeConfig.allowedTraits) {
      plugin.setAllowedTraits(brazeConfig.allowedTraits);
    }
  } catch (error) {
    Logger.error(
      error as Error,
      '[Braze] Failed to sync allowlists from remote config',
    );
  }
}

/**
 * Resolve the profile ID from the current session and forward it to the
 * Braze Segment plugin so all subsequent identify / track / flush calls
 * are attributed to this identity.
 *
 * Skipped during E2E so CI does not create Braze profiles from mocked
 * identity sessions.
 */
export async function setBrazeUser(): Promise<void> {
  if (isE2E) {
    return;
  }

  try {
    const { AuthenticationController } = Engine.context;
    const sessionProfile = await AuthenticationController.getSessionProfile();
    if (sessionProfile?.profileId) {
      getBrazePlugin().setBrazeProfileId(sessionProfile.profileId);
      Logger.log('[Braze] Identified user with profileId');
    }
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to set Braze user');
  }
}

/**
 * Clear the Braze profile identity so the plugin becomes a no-op.
 * Call on sign-out to stop attributing events to the previous user.
 */
export function clearBrazeUser(): void {
  getBrazePlugin().setBrazeProfileId(undefined);
  Logger.log('[Braze] Cleared Braze user identity');
}
