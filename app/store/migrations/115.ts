import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

export const migrationVersion = 115;

/**
 * Migration 115: Remove preventPollingOnNetworkRestart from TokenListController state
 *
 * This migration removes the deprecated `preventPollingOnNetworkRestart` property
 * from TokenListController state. This property was removed in @metamask/assets-controllers v99.0.0.
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state.engine.backgroundState, 'TokenListController')) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid TokenListController state: missing TokenListController`,
        ),
      );
      return state;
    }

    const tokenListController = state.engine.backgroundState.TokenListController;

    if (!isObject(tokenListController)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid TokenListController state: '${typeof tokenListController}'`,
        ),
      );
      return state;
    }

    if (hasProperty(tokenListController, 'preventPollingOnNetworkRestart')) {
      delete tokenListController.preventPollingOnNetworkRestart;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
}
