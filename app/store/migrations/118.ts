import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { hasProperty, isObject } from '@metamask/utils';
import { BridgeStatusControllerState } from '@metamask/bridge-status-controller';

const migrationVersion = 118;
const INTENT_KEY_PREFIX = 'intent:';

/**
 * Migration 115: Re-key intent txHistory items to remove the intent prefix.
 *
 * Intent transactions used to be stored with a `intent:` prefix on the key.
 * The controller now uses the orderId directly, so we migrate existing keys.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state, 'engine') || !isObject(state.engine)) {
      return state;
    }

    if (
      !hasProperty(state.engine, 'backgroundState') ||
      !isObject(state.engine.backgroundState) ||
      !hasProperty(state.engine.backgroundState, 'BridgeStatusController')
    ) {
      return state;
    }

    const bridgeStatusControllerState =
      state.engine.backgroundState.BridgeStatusController;

    if (!isObject(bridgeStatusControllerState)) {
      return state;
    }

    if (!isObject(bridgeStatusControllerState.txHistory)) {
      return state;
    }

    const { txHistory } =
      bridgeStatusControllerState as BridgeStatusControllerState;

    Object.keys(txHistory).forEach((key) => {
      if (!key.startsWith(INTENT_KEY_PREFIX)) {
        return;
      }

      const newKey = key.slice(INTENT_KEY_PREFIX.length);
      if (!newKey || newKey === key) {
        return;
      }

      if (!hasProperty(txHistory, newKey)) {
        txHistory[newKey] = txHistory[key];
      }

      delete txHistory[key];
    });

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to re-key intent txHistory items. Error: ${error}`,
      ),
    );
    return state;
  }
}
