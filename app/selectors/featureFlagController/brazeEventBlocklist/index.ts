import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * LaunchDarkly key for events that must not be forwarded to Braze.
 *
 * Variation value, direct or wrapped in `{ value: ... }`:
 * `{ "enabled": true, "minimumVersion": "x.x.x", "blockedEvents": ["Event Name"] }`
 */
export const BRAZE_EVENT_BLOCKLIST_FLAG_KEY = 'brazeEventBlocklist' as const;

/**
 * Event names that must not be forwarded to Braze.
 *
 * Returns an empty list when the flag is missing, disabled, below
 * `minimumVersion`, or `blockedEvents` is not an array of strings. An empty
 * list means every event is sent.
 *
 * @param remoteFlag - Raw `brazeEventBlocklist` variation.
 * @returns Event names to drop before they reach Braze.
 */
export function getBrazeBlockedEventNames(remoteFlag: unknown): string[] {
  try {
    if (validatedVersionGatedFeatureFlag(remoteFlag) !== true) {
      return [];
    }

    const blockedEvents = readBlockedEvents(remoteFlag);
    return blockedEvents ?? [];
  } catch {
    return [];
  }
}

/**
 * Whether a remote flag variation carries a string array of blocked events.
 *
 * @param remoteFlag - Raw flag variation, including a progressive-rollout wrapper.
 * @returns The event names, or `undefined` when the list is absent or malformed.
 */
function readBlockedEvents(remoteFlag: unknown): string[] | undefined {
  if (!remoteFlag || typeof remoteFlag !== 'object') {
    return undefined;
  }

  const record = remoteFlag as Record<string, unknown>;
  const source =
    record.value !== null && typeof record.value === 'object'
      ? (record.value as Record<string, unknown>)
      : record;
  const blockedEvents = source.blockedEvents;

  if (
    !Array.isArray(blockedEvents) ||
    !blockedEvents.every((eventName) => typeof eventName === 'string')
  ) {
    return undefined;
  }

  return blockedEvents;
}

/**
 * Blocked Braze event names from the current remote feature flags.
 */
export const selectBrazeBlockedEventNames = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] =>
    getBrazeBlockedEventNames(
      remoteFeatureFlags?.[BRAZE_EVENT_BLOCKLIST_FLAG_KEY],
    ),
);
