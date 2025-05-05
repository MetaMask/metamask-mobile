import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 75: Remove `contractBalances` from `TokenBalancesController`
 * remove `internalTransactions` from `TransactionController`
 * remove `isCustomNetwork` from `NetworkController`
 * from the app storage
 */

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, 75)) {
    return state;
  }

  const tokenBalancesControllerState =
    state.engine.backgroundState.TokenBalancesController;

  const transactionControllerState =
    state.engine.backgroundState.TransactionController;

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(tokenBalancesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 75: Invalid TokenBalancesController state error: '${typeof tokenBalancesControllerState}'`,
      ),
    );
    return state;
  }

  if (!isObject(transactionControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 75: Invalid TransactionController state error: '${typeof transactionControllerState}'`,
      ),
    );
    return state;
  }

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 75: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if ('contractBalances' in tokenBalancesControllerState) {
    delete tokenBalancesControllerState.contractBalances;
  }

  if ('internalTransactions' in transactionControllerState) {
    delete transactionControllerState.internalTransactions;
  }

  if ('isCustomNetwork' in networkControllerState) {
    delete networkControllerState.isCustomNetwork;
  }

  return state;
};

export default migration;
