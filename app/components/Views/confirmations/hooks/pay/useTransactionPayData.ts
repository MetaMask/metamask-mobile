import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import {
  selectIsTransactionPayLoadingByTransactionId,
  selectTransactionPayQuotesByTransactionId,
  selectTransactionPaySourceAmountsByTransactionId,
  selectTransactionPayTokensByTransactionId,
  selectTransactionPayTotalsByTransactionId,
} from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmationContext } from '../../context/confirmation-context';

export function useTransactionPayQuotes() {
  return useTransactionPayData(selectTransactionPayQuotesByTransactionId);
}

export function useTransactionPayRequiredTokens() {
  return useTransactionPayData(selectTransactionPayTokensByTransactionId);
}

export function useTransactionPaySourceAmounts() {
  return useTransactionPayData(
    selectTransactionPaySourceAmountsByTransactionId,
  );
}

export function useIsTransactionPayLoading() {
  const { isTransactionDataUpdating } = useConfirmationContext();

  return (
    useTransactionPayData(selectIsTransactionPayLoadingByTransactionId) ||
    isTransactionDataUpdating
  );
}

export function useTransactionPayTotals() {
  return useTransactionPayData(selectTransactionPayTotalsByTransactionId);
}

function useTransactionPayData<T>(
  selector: (state: RootState, transactionId: string) => T,
) {
  const { id: transactionId } = useTransactionMetadataRequest() || { id: '' };

  return useSelector((state: RootState) => selector(state, transactionId));
}
