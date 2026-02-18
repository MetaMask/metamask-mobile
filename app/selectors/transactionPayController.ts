import { createSelector } from 'reselect';
import { RootState } from '../reducers';

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

export const selectTransactionPayQuotesByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.quotes,
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

export const selectTransactionPayTransactionData = createSelector(
  selectTransactionPayControllerState,
  (state) => state.transactionData,
);
