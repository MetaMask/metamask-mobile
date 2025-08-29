import { useTokenAmount } from '../../../hooks/useTokenAmount';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import {
  selectIsTransactionBridgeQuotesLoadingById,
  selectTransactionBridgeQuotesById,
} from '../../../../../../core/redux/slices/confirmationMetrics';
import { BigNumber } from 'bignumber.js';
import { usePerpsDepositInit } from './usePerpsDepositInit';

export function usePerpsDepositView({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  // usePerpsDepositInit();

  const { id: transactionId } = useTransactionMetadataOrThrow();
  const { amountUnformatted } = useTokenAmount();
  const amountValue = new BigNumber(amountUnformatted ?? '0');

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId),
  );

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(state, transactionId),
  );

  const isFullView =
    !isKeyboardVisible &&
    !amountValue.isZero() &&
    (isQuotesLoading || Boolean(quotes?.length));

  return {
    isFullView,
  };
}
