import {
  TransactionData,
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

/**
 * A pay-type deposit or conversion may submit without quotes only when the
 * user pays with the required token itself and the controller recorded no
 * pending conversion. Anything else (payment token missing or different, or
 * a required conversion without a quote) means the transaction would land
 * without funds, so it must not submit.
 *
 * @param data - Pay state for the transaction.
 * @returns Whether direct submission is safe.
 */
function isValidatedDirectDeposit(data: TransactionData | undefined): boolean {
  const paymentToken = data?.paymentToken;

  if (!paymentToken) {
    return false;
  }

  const tokens = data?.tokens ?? [];
  const requiredToken = tokens.find((token) => !token.skipIfBalance);

  const isPayingWithRequiredToken =
    Boolean(requiredToken) &&
    requiredToken?.chainId === paymentToken.chainId &&
    requiredToken?.address.toLowerCase() === paymentToken.address.toLowerCase();

  if (!isPayingWithRequiredToken) {
    return false;
  }

  const hasRequiredConversion = (data?.sourceAmounts ?? []).some(
    (sourceAmount) =>
      !tokens.find(
        (token) =>
          token.address.toLowerCase() ===
          sourceAmount.targetTokenAddress.toLowerCase(),
      )?.skipIfBalance,
  );

  return !hasRequiredConversion;
}

/**
 * A fiat-funded deposit submits without a pay quote because the on-ramp
 * order itself is the funding source; the flow is validated at confirmation
 * time by the fiat no-quotes alert (see useNoPayTokenQuotesAlert), and the
 * auto-fiat-submission hook publishes as soon as the order is created,
 * before any pay token is ever selected on the controller.
 *
 * @param data - Pay state for the transaction.
 * @returns Whether the fiat-funded submission is safe.
 */
function isValidatedFiatDeposit(data: TransactionData | undefined): boolean {
  return Boolean(data?.fiatPayment?.orderId);
}

/**
 * Whether a pay-token-required transaction would pass the publish guard: an
 * executable quote is in state, or the route needs none (validated direct or
 * fiat-funded deposit). Anything else is rejected at publish with
 * "MetaMask Pay: Cannot submit without quote", so CTAs must stay blocked
 * while this is false.
 *
 * @param data - Pay state for the transaction.
 * @returns Whether submission would pass the publish guard.
 */
export function isPayTokenSubmitReady(
  data: TransactionData | undefined,
): boolean {
  const executableQuotes = (data?.quotes ?? []).filter(
    (quote) => !isNoOpQuote(quote),
  );

  if (executableQuotes.length) {
    return true;
  }

  return isValidatedDirectDeposit(data) || isValidatedFiatDeposit(data);
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

export const selectTransactionPayRawQuotesByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.quotes,
);

export const selectTransactionPayQuotesByTransactionId = createSelector(
  selectTransactionPayRawQuotesByTransactionId,
  (quotes) => quotes?.filter((quote) => !isNoOpQuote(quote)),
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

export const selectTransactionPayQuoteErrorByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => transactionData?.quoteError,
);

export const selectIsTransactionPaySubmitReadyByTransactionId = createSelector(
  selectTransactionDataByTransactionId,
  (transactionData) => isPayTokenSubmitReady(transactionData),
);
