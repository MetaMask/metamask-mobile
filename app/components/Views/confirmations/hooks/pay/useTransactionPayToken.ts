import { useDispatch, useSelector } from 'react-redux';
import {
  TransactionPayToken,
  selectTransactionPayToken,
  setTransactionPayToken,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import { useCallback, useMemo } from 'react';
import { RootState } from '../../../../../reducers';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { Hex } from '@metamask/utils';
import { useDeepMemo } from '../useDeepMemo';
import { BridgeToken } from '../../../../UI/Bridge/types';

export type TransactionPayToken = BridgeToken & {
  address: Hex;
  chainId: Hex;
};

export function useTransactionPayToken() {
  const dispatch = useDispatch();

  const { chainId: transactionChainId, id: transactionId } =
    useTransactionMetadataRequest() || {};

  const selectedPayToken = useSelector((state: RootState) =>
    selectTransactionPayToken(state, transactionId as string),
  );

  const chainId = selectedPayToken?.chainId || transactionChainId;
  const tokens = useTokensWithBalance({ chainIds: [chainId] });

  const token = useDeepMemo(
    () =>
      tokens.find(
        (t) =>
          t.chainId === chainId &&
          t.address.toLowerCase() === selectedPayToken?.address.toLowerCase(),
      ),
    [tokens, chainId, selectedPayToken],
  );

  const payToken = useMemo(
    () =>
      token
        ? {
            ...token,
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          }
        : undefined,
    [token],
  );

  return {
    payToken,
  };
}
