import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../reducers';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectIsTransactionUpdatingById,
} from '../../../../../core/redux/slices/confirmationMetrics';

export function useIsTransactionPayLoading() {
  const { id: transactionId } = useTransactionMetadataRequest() ?? { id: '' };

  const isBridgeQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const isUpdating = useSelector((state: RootState) =>
    selectIsTransactionUpdatingById(state, transactionId),
  );

  const isLoading = isBridgeQuotesLoading || isUpdating;

  return { isLoading };
}
