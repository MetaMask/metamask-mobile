import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import {
  selectIsTransactionPayLoadingByTransactionId,
  selectIsTransactionPaySubmitReadyByTransactionId,
  selectTransactionPayFiatPaymentByTransactionId,
  selectTransactionPayIsMaxAmountByTransactionId,
  selectTransactionPayIsPostQuoteByTransactionId,
  selectTransactionPayQuoteErrorByTransactionId,
  selectTransactionPayQuotesByTransactionId,
  selectTransactionPayQuotesLastUpdatedByTransactionId,
  selectTransactionPayRawQuotesByTransactionId,
  selectTransactionPaySourceAmountsByTransactionId,
  selectTransactionPayTokensByTransactionId,
  selectTransactionPayTotalsByTransactionId,
} from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmationContext } from '../../context/confirmation-context';

export function useTransactionPayQuotesRaw() {
  return useTransactionPayData(selectTransactionPayRawQuotesByTransactionId);
}

export function useTransactionPayQuotes() {
  return useTransactionPayData(selectTransactionPayQuotesByTransactionId);
}

export function useTransactionPayQuotesLastUpdated() {
  return useTransactionPayData(
    selectTransactionPayQuotesLastUpdatedByTransactionId,
  );
}

export function useTransactionPayRequiredTokens() {
  return useTransactionPayData(selectTransactionPayTokensByTransactionId);
}

export function useTransactionPayPrimaryRequiredToken() {
  const requiredTokens = useTransactionPayRequiredTokens();
  return requiredTokens?.[0];
}

export function useTransactionPaySourceAmounts() {
  return useTransactionPayData(
    selectTransactionPaySourceAmountsByTransactionId,
  );
}

export function useIsTransactionPayQuoteLoading() {
  return useTransactionPayData(selectIsTransactionPayLoadingByTransactionId);
}

export function useIsTransactionPayLoading() {
  const { isTransactionDataUpdating } = useConfirmationContext();

  return useIsTransactionPayQuoteLoading() || isTransactionDataUpdating;
}

export function useTransactionPayTotals() {
  return useTransactionPayData(selectTransactionPayTotalsByTransactionId);
}

export function useTransactionPayIsMaxAmount() {
  return useTransactionPayData(selectTransactionPayIsMaxAmountByTransactionId);
}

export function useTransactionPayIsPostQuote() {
  return useTransactionPayData(selectTransactionPayIsPostQuoteByTransactionId);
}

export function useTransactionPayFiatPayment() {
  return useTransactionPayData(selectTransactionPayFiatPaymentByTransactionId);
}

export function useTransactionPayQuoteError() {
  return useTransactionPayData(selectTransactionPayQuoteErrorByTransactionId);
}

/**
 * Whether the pay transaction would pass the publish guard (executable quote
 * in state, or a validated direct or fiat route). CTAs that confirm a
 * pay-token-required transaction must stay blocked while this is false.
 */
export function useIsTransactionPaySubmitReady() {
  return useTransactionPayData(
    selectIsTransactionPaySubmitReadyByTransactionId,
  );
}

function useTransactionPayData<T>(
  selector: (state: RootState, transactionId: string) => T,
) {
  const { id: transactionId } = useTransactionMetadataRequest() || { id: '' };

  return useSelector((state: RootState) => selector(state, transactionId));
}
