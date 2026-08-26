import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { MOBILE_PRO_LAYOUT_DEFAULTS } from '../../components/UI/Perps/constants/perpsConfig';
import { ensureValidState } from './util';

export const migrationVersion = 151;

interface PerpsControllerLike {
  proLayoutPreferences?: unknown;
}

/**
 * Migration 151: Apply the mobile Pro-mode order-book layout defaults.
 *
 * The shared controller defaults (order book closed, pinned left) match
 * Extension. Mobile is deliberately the opposite — open and pinned right — so
 * installs created before that split have the Extension values on disk.
 *
 * Neither preference was reachable from shipped mobile UI before this change:
 * the position switcher did not exist, and open/closed was component state that
 * was never persisted. So no stored value here reflects a user's choice, and
 * overwriting both is safe.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const perpsController = state.engine.backgroundState.PerpsController as
    | PerpsControllerLike
    | undefined;

  if (perpsController === undefined) {
    return state;
  }

  if (!isObject(perpsController)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid PerpsController state: '${typeof perpsController}'`,
      ),
    );
    return state;
  }

  if (!hasProperty(perpsController, 'proLayoutPreferences')) {
    // Nothing persisted yet; controller init seeds the mobile defaults.
    return state;
  }

  const { proLayoutPreferences } = perpsController;

  if (!isObject(proLayoutPreferences)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid proLayoutPreferences state: '${typeof proLayoutPreferences}'`,
      ),
    );
    return state;
  }

  perpsController.proLayoutPreferences = {
    ...proLayoutPreferences,
    ...MOBILE_PRO_LAYOUT_DEFAULTS,
  };

  return state;
}
