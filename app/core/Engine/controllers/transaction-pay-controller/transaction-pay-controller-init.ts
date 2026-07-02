import type { MessengerClientInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
} from '@metamask/transaction-pay-controller';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { getAmountData } from './amount-data-callback';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';
import { getPaymentOverrideData } from './paymentoverride-callback';
import { createPolymarketCallbacks } from './polymarket-callbacks';
import { getTransactionPayFiatTestOptions } from '../../../../util/environment';

export const TransactionPayControllerInit: MessengerClientInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
      getAmountData,
      getDelegationTransaction: ({ transaction, caveats }) =>
        getDelegationTransaction(initMessenger, transaction, caveats),
      fiatOptions: getTransactionPayFiatTestOptions(),
      getPaymentOverrideData: (paymentOverrideRequest) =>
        getPaymentOverrideData(paymentOverrideRequest, initMessenger),
      messenger: controllerMessenger,
      polymarket: createPolymarketCallbacks(initMessenger),
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
