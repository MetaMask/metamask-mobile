import type { MessengerClientInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
} from '@metamask/transaction-pay-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';
import {
  getTransactionPayRouteContext,
  normalizeMetaMaskPayRoutingFlags,
  resolveMetaMaskPayStrategies,
} from '../../../../util/transactions/transaction-pay-routing';

export const TransactionPayControllerInit: MessengerClientInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
      getDelegationTransaction: ({ transaction }) =>
        getDelegationTransaction(initMessenger, transaction),
      getStrategies: (transaction) =>
        getTransactionPayStrategies(transaction, controllerMessenger),
      messenger: controllerMessenger,
      state: persistedState.TransactionPayController,
    });

    return { controller: transactionPayController };
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize TransactionPayController',
    );
    throw error;
  }
};

function getTransactionPayStrategies(
  transaction: TransactionMeta,
  messenger: TransactionPayControllerMessenger,
) {
  const featureFlagState = messenger.call(
    'RemoteFeatureFlagController:getState',
  );
  const featureFlags = {
    ...(featureFlagState?.remoteFeatureFlags ?? {}),
    ...(featureFlagState?.localOverrides ?? {}),
  };

  const routeContext = getTransactionPayRouteContext(transaction);
  const routingFlags = normalizeMetaMaskPayRoutingFlags(
    featureFlags.confirmations_pay,
  );

  return resolveMetaMaskPayStrategies(routeContext, routingFlags);
}
