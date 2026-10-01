import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

export const migrationVersion = 153;

/**
 * Migration 153: Remove `lastDismissedBrazeBanner` from the `banners` slice.
 *
 * Braze SDK v23 records banner closes via `dismissBanner`, so the client no
 * longer persists the last dismissed campaign for cross-session suppression.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!isObject(state) || !isObject(state.banners)) {
      return state;
    }

    if (!hasProperty(state.banners, 'lastDismissedBrazeBanner')) {
      return state;
    }

    const banners: Record<string, unknown> = { ...state.banners };
    delete banners.lastDismissedBrazeBanner;

    return {
      ...state,
      banners,
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove lastDismissedBrazeBanner: ${String(error)}`,
      ),
    );
  }

  return state;
};

export default migration;
