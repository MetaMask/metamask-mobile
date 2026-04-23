import { TransactionMeta } from '@metamask/transaction-controller';
import {
  SmartTransactionsController,
  type SmartTransaction,
  type Fees,
} from '@metamask/smart-transactions-controller';
import Engine, { type RootExtendedMessenger } from '../../core/Engine';
import { isProduction } from '../environment';

const TIMEOUT_FOR_SMART_TRANSACTION_CONFIRMATION_DONE_EVENT = 10000;

const waitForSmartTransactionConfirmationDone = (
  controllerMessenger: RootExtendedMessenger,
): Promise<SmartTransaction | undefined> =>
  new Promise((resolve) => {
    controllerMessenger.subscribe(
      'SmartTransactionsController:smartTransactionConfirmationDone',
      async (smartTransaction: SmartTransaction) => {
        resolve(smartTransaction);
      },
    );
    setTimeout(() => {
      resolve(undefined); // In a rare case we don't get the "smartTransactionConfirmationDone" event within 10 seconds, we resolve with undefined to continue.
    }, TIMEOUT_FOR_SMART_TRANSACTION_CONFIRMATION_DONE_EVENT);
  });

export const getSmartTransactionMetricsProperties = async (
  smartTransactionsController: SmartTransactionsController,
  transactionMeta: TransactionMeta | undefined,
  waitForSmartTransaction: boolean,
  controllerMessenger?: RootExtendedMessenger,
  isSmartTransactionsUserOptIn?: boolean,
  isSmartTransactionsAvailable?: boolean,
  shouldUseSmartTransaction?: boolean,
) => {
  const baseProperties = {
    is_smart_transactions_user_opt_in: isSmartTransactionsUserOptIn ?? false,
    is_smart_transactions_available: isSmartTransactionsAvailable ?? false,
    is_smart_transaction: shouldUseSmartTransaction ?? false,
  };

  if (!transactionMeta || !baseProperties.is_smart_transaction) {
    return baseProperties;
  }

  let smartTransaction =
    smartTransactionsController.getSmartTransactionByMinedTxHash(
      transactionMeta.hash,
    );
  const shouldWaitForSmartTransactionConfirmationDoneEvent =
    waitForSmartTransaction &&
    !smartTransaction?.statusMetadata && // We get this after polling for a status for a Smart Transaction.
    controllerMessenger;
  if (shouldWaitForSmartTransactionConfirmationDoneEvent) {
    smartTransaction =
      await waitForSmartTransactionConfirmationDone(controllerMessenger);
  }
  if (!smartTransaction?.statusMetadata) {
    // Still mark as smart transaction since this function is only called when
    // smart transactions are enabled for the chain. Cancelled/dropped smart
    // transactions won't have a mined tx hash, so the lookup above returns
    // nothing, but the transaction still went through the smart transaction flow.
    return baseProperties;
  }
  return {
    ...baseProperties,
    stx_original_transaction_status:
      smartTransaction.statusMetadata.originalTransactionStatus,
  };
};

export type GasIncludedQuote = Fees & { isGasIncludedTrade?: boolean };

// Currently, we take the first token for gas fee payment, but later, a user can choose which token to use for gas payment.
export const getTradeTxTokenFee = (quote: GasIncludedQuote) =>
  // @ts-expect-error Property 'tokenFees' does not exist on type 'Fee'. Need to update the type.
  quote?.tradeTxFees?.fees?.[0]?.tokenFees?.[0];

// We get gas included fees from a swap quote now. In a future iteration we will have a universal
// implementation that works for non-swaps transactions as well.
export const getGasIncludedTransactionFees = (quote: GasIncludedQuote) => {
  const tradeTxTokenFee = getTradeTxTokenFee(quote);
  let transactionFees;
  if (tradeTxTokenFee && quote?.isGasIncludedTrade) {
    transactionFees = {
      approvalTxFees: quote?.approvalTxFees,
      tradeTxFees: quote?.tradeTxFees,
    };
  }
  return transactionFees;
};

export const getIsAllowedRpcUrlForSmartTransactions = (rpcUrl?: string) => {
  // Allow in non-production environments.
  if (!isProduction()) {
    return true;
  }

  const hostname = rpcUrl && new URL(rpcUrl).hostname;

  return (
    hostname?.endsWith('.infura.io') ||
    hostname?.endsWith('.binance.org') ||
    false
  );
};

/**
 * Wipes smart transactions from the SmartTransactionsController state.
 * This should be called when resetting an account to clear smart transaction history for a specific address.
 * @param address - The address whose smart transactions should be wiped
 */
export function wipeSmartTransactions(address: string) {
  const { SmartTransactionsController: controller } = Engine.context;
  controller.wipeSmartTransactions({
    address,
    ignoreNetwork: true,
  });
}
