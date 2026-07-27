import {
  TransactionPayQuote,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';

/**
 * Check whether a quote is a no-op quote. The controller stores one when a
 * route needs no conversion. No-op quotes cannot be executed and must be
 * ignored anywhere quotes drive fees, steps, or routing UI.
 */
export function isNoOpQuote(
  quote: Pick<TransactionPayQuote<unknown>, 'strategy'>,
): boolean {
  return quote.strategy === TransactionPayStrategy.None;
}

const selectTransactionPayControllerState = (state: RootState) =>
  state.engine.backgroundState.TransactionPayController ?? {
    transactionData: {},
  };

export const selectTransactionDataByTransactionId = createSelector(
  selectTransactionPayControllerState,
  (_state: RootState, transactionId: string) => transactionId,
  (transactionPayControllerState, transactionId) =>
    transactionPayControllerState.transactionData[transactionId],
);

export const selectTransactionPayTotalsByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.totals,
);

export const selectIsTransactionPayLoadingByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.isLoading ?? false,
);

// Executable quotes only. No-op quotes mark direct routes and must not
// surface in fee, duration, or step UI, so they are filtered here for all
// consumers.
export const selectTransactionPayQuotesByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) =>
    transactionData?.quotes &&
    transactionData.quotes.filter((quote) => !isNoOpQuote(quote)),
);

export const selectTransactionPayQuotesLastUpdatedByTransactionId =
  createSelector(
    selectTransactionDataByTransactionId,
    (transactionData) => transactionData?.quotesLastUpdated,
  );

export const selectTransactionPayTokensByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.tokens ?? [],
);

export const selectTransactionPaymentTokenByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.paymentToken,
);

export const selectTransactionPaySourceAmountsByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.sourceAmounts,
);

export const selectTransactionPayIsMaxAmountByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.isMaxAmount ?? false,
);

export const selectTransactionPayIsPostQuoteByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.isPostQuote ?? false,
);

export const selectTransactionPayFiatPaymentByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.fiatPayment,
);

export const selectTransactionPayTransactionData = createSelector(
  selectTransactionPayControllerState,
  (state) => state.transactionData,
);

export const selectAccountOverrideByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.accountOverride,
);

export const selectPaymentOverrideByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) =>
    (transactionData as Record<string, unknown> | undefined)
      ?.paymentOverride as string | undefined,
);
