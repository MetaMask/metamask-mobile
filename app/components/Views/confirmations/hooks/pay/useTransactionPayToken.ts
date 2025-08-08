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
import { Hex } from '@metamask/utils';
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

  const token = tokens.find(
    (t) =>
      t.chainId === chainId &&
      t.address.toLowerCase() ===
        (selectedPayToken?.address.toLowerCase() ??
          EMPTY_ADDRESS.toLowerCase()),
  );

  const defaultPayToken: TransactionPayToken = {
    address: EMPTY_ADDRESS,
    chainId: transactionChainId as Hex,
  };

  const decimals = token?.decimals ?? 18;
  const balanceHuman = token?.balance ?? '0';
  const balanceFiat = token?.tokenFiatAmount?.toString() ?? '0';

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

  const payToken = selectedPayToken ?? defaultPayToken;

  return {
    balanceFiat,
    balanceHuman,
    decimals,
    payToken,
    setPayToken,
  };
}
