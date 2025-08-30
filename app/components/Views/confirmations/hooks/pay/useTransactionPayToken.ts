import { useDispatch, useSelector } from 'react-redux';
import {
  TransactionPayToken,
  selectTransactionPayToken,
  setTransactionPayToken,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useCallback } from 'react';
import { RootState } from '../../../../../reducers';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';

export function useTransactionPayToken() {
  const dispatch = useDispatch();
  const { id: transactionId } = useTransactionMetadataRequest() || {};

  const selectedPayToken = useSelector((state: RootState) =>
    selectTransactionPayToken(state, transactionId as string),
  );

  const payToken = useTokenWithBalance(
    selectedPayToken?.address ?? '0x0',
    selectedPayToken?.chainId ?? '0x0',
  );

  const setPayToken = useCallback(
    (newPayToken: TransactionPayToken) => {
      dispatch(
        setTransactionPayToken({
          transactionId: transactionId as string,
          payToken: newPayToken,
        }),
      );
    },
    [dispatch, transactionId],
  );

  return {
    payToken,
    setPayToken,
  };
}
