import { useDispatch, useSelector } from 'react-redux';
import {
  TransactionPayToken,
  selectTransactionPayToken,
  setTransactionPayToken,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import { useCallback } from 'react';
import { RootState } from '../../../../../reducers';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';

export function useTransactionPayToken() {
  const dispatch = useDispatch();

  const { chainId: transactionChainId, id: transactionId } =
    useTransactionMetadataRequest() || {};

  const selectedPayToken = useSelector((state: RootState) =>
    selectTransactionPayToken(state, transactionId as string),
  );

  const chainId = selectedPayToken?.chainId || transactionChainId;
  const tokens = useTokensWithBalance({ chainIds: [chainId] });

  const setPayToken = useCallback(
    (payToken: TransactionPayToken) => {
      dispatch(
        setTransactionPayToken({
          transactionId: transactionId as string,
          payToken,
        }),
      );
    },
    [dispatch, transactionId],
  );

  const token = tokens.find(
    (t) =>
      t.chainId === chainId &&
      t.address.toLowerCase() ===
        (selectedPayToken?.address.toLowerCase() ??
          EMPTY_ADDRESS.toLowerCase()),
  );

  if (!selectedPayToken || !token) {
    return {
      setPayToken,
    };
  }

  const decimals = token.decimals;
  const balanceHuman = token.balance;
  const balanceFiat = token.tokenFiatAmount?.toString();

  const payToken = selectedPayToken;

  return {
    balanceFiat,
    balanceHuman,
    decimals,
    payToken,
    setPayToken,
  };
}
