import type { MessengerClientInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayClientId,
  TransactionPayController,
  TransactionPayControllerMessenger,
} from '@metamask/transaction-pay-controller';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { getAmountData } from './amount-data-callback';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';
import { getPaymentOverrideData } from './paymentoverride-callback';
import { createPolymarketCallbacks } from './polymarket-callbacks';
import { getBalance } from './get-balance-callback';
import { getTransactionPayFiatTestOptions } from '../../../../util/environment';
import { waitForEngineReady } from '../../utils/engine-ready';

export const TransactionPayControllerInit: MessengerClientInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
      clientId: TransactionPayClientId.Mobile,
      fiatOptions: getTransactionPayFiatTestOptions(),
      getAmountData,
      getBalance,
      getDelegationTransaction: ({ transaction, isSubsidized }) =>
        getDelegationTransaction(initMessenger, transaction, isSubsidized),
      getPaymentOverrideData: (paymentOverrideRequest) =>
        getPaymentOverrideData(paymentOverrideRequest, initMessenger),
      messenger: controllerMessenger,
      polymarket: createPolymarketCallbacks(initMessenger),
      state: persistedState.TransactionPayController,
      waitForClientReady: waitForEngineReady,
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
