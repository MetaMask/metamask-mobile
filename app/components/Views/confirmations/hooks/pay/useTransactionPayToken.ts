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
import { selectTokensByChainIdAndAddress } from '../../../../../selectors/tokensController';

export function useTransactionPayToken() {
  const dispatch = useDispatch();

  const { chainId: transactionChainId, id: transactionId } =
    useTransactionMetadataRequest() || {};

  const selectedPayToken = useSelector((state: RootState) =>
    selectTransactionPayToken(state, transactionId as string),
  );

  const chainId = selectedPayToken?.chainId || transactionChainId;

  const chainTokens = Object.values(
    useSelector((state) => selectTokensByChainIdAndAddress(state, chainId)),
  );

  const token = chainTokens.find(
    (t) => t.address.toLowerCase() === selectedPayToken?.address.toLowerCase(),
  );

  const defaultPayToken: TransactionPayToken = {
    address: EMPTY_ADDRESS,
    chainId: transactionChainId as Hex,
  };

  const decimals = token?.decimals ?? 18;

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
    decimals,
    payToken,
    setPayToken,
  };
}
