import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

export const migrationVersion = 133;

/**
 * Migration 132: Add `lastDismissedBrazeBanner` field to the `banners` slice.
 *
 * Existing installs only have `dismissedBanners`; this migration adds the new
 * field with its default value of `null` so the reducer's initial state and
 * any rehydrated state are always in sync.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!isObject(state) || !isObject(state.banners)) {
      return state;
    }

    const banners = state.banners as Record<string, unknown>;
    if (!hasProperty(banners, 'lastDismissedBrazeBanner')) {
      banners.lastDismissedBrazeBanner = null;
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to add lastDismissedBrazeBanner: ${String(error)}`,
      ),
    );
  }

  return state;
};

export default migration;
