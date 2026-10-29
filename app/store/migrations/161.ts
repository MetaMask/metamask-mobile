import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 161;

interface PerpsControllerLike {
  proLayoutPreferences?: unknown;
}

/**
 * Migration 161: Open the Pro inline chart by default.
 *
 * Pro mode shipped with `chartExpanded: false`, and that value was written to
 * disk as the controller default. The shared default later became expanded, but
 * a stored `false` still wins, so those installs keep the chart collapsed.
 *
 * A stored `false` cannot be told apart from someone who collapsed the chart
 * on purpose. This writes `true` once. Collapsing the chart after this
 * migration still persists.
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
    // No stored layout yet. The selector answers with the expanded default.
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
    chartExpanded: true,
  };

  return state;
}
