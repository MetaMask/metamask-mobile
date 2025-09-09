import { useDispatch, useSelector } from 'react-redux';
import {
  TransactionPayToken,
  selectTransactionPayToken,
  setTransactionPayToken,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useCallback, useMemo } from 'react';
import { RootState } from '../../../../../reducers';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { BigNumber } from 'bignumber.js';

export function useTransactionPayToken() {
  const dispatch = useDispatch();
  const { id: transactionId } = useTransactionMetadataRequest() || {};

  const selectedPayToken = useSelector((state: RootState) =>
    selectTransactionPayToken(state, transactionId as string),
  );

  const payTokenRaw = useTokenWithBalance(
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

  const payToken = useMemo(() => {
    if (!payTokenRaw) return undefined;

    const balanceRaw = new BigNumber(payTokenRaw.balance)
      .shiftedBy(payTokenRaw.decimals)
      .toFixed(0);

    return {
      ...payTokenRaw,
      balanceRaw,
    };
  }, [payTokenRaw]);

  return {
    payToken,
    setPayToken,
  };
}
