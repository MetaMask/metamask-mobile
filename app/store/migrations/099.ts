import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { isObject } from '@metamask/utils';
import { BridgeStatusControllerState } from '@metamask/bridge-status-controller';
import { isSolanaChainId } from '@metamask/bridge-controller';

/**
 * Migration: Update bridge txHistory for solana to use txHash as key and txMetaId
 */
const migration = async (state: unknown): Promise<unknown> => {
  const migrationVersion = 99;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
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

    if (!isObject(txHistory)) {
      return state;
    }

    Object.entries(txHistory).forEach(([key, historyItem]) => {
      const srcChainId =
        historyItem.status?.srcChain?.chainId ?? historyItem.quote?.srcChainId;
      const isSolanaTx = isSolanaChainId(srcChainId);
      const newId = historyItem.status?.srcChain?.txHash;
      // If solana tx, use the src chain tx hash as the key and txMetaId
      if (isSolanaTx && newId) {
        txHistory[newId] = {
          ...historyItem,
          txMetaId: newId,
        };
        delete txHistory[key];
      }
    });

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to update bridge txHistory for solana to use txHash as key and txMetaId. Error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
