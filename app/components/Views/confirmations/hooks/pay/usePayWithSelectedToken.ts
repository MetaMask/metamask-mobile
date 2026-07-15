import { useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { isMatchingPayToken } from '../../utils/transaction-pay';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from './useAutomaticTransactionPayToken';
import { useTransactionPayToken } from './useTransactionPayToken';

export interface PayWithSelectedToken {
  address: Hex;
  balanceUsd: string;
  chainId: Hex;
  symbol: string;
}

export interface UsePayWithSelectedTokenResult {
  isSelectedDistinctFromAutomatic: boolean;
  selectedToken: PayWithSelectedToken | undefined;
  selectToken: (target: SetPayTokenRequest) => void;
}

export function usePayWithSelectedToken({
  preferredToken,
}: {
  preferredToken?: SetPayTokenRequest;
} = {}): UsePayWithSelectedTokenResult {
  const { payToken, setPayToken } = useTransactionPayToken();
  const automaticToken = useAutomaticTransactionPayToken({
    preferredToken,
    disable: true,
  });

  const isSelectedDistinctFromAutomatic = useMemo(() => {
    if (!payToken || !automaticToken) {
      return false;
    }
    return !isMatchingPayToken(payToken, automaticToken);
  }, [automaticToken, payToken]);

  const selectedToken = useMemo<PayWithSelectedToken | undefined>(() => {
    if (!payToken) {
      return undefined;
    }
    return {
      address: payToken.address,
      balanceUsd: payToken.balanceUsd,
      chainId: payToken.chainId,
      symbol: payToken.symbol,
    };
  }, [payToken]);

  const selectToken = useCallback(
    (target: SetPayTokenRequest) => {
      if (payToken && isMatchingPayToken(payToken, target)) {
        return;
      }
      setPayToken(target);
    },
    [payToken, setPayToken],
  );

  return useMemo(
    () => ({
      isSelectedDistinctFromAutomatic,
      selectedToken,
      selectToken,
    }),
    [isSelectedDistinctFromAutomatic, selectToken, selectedToken],
  );
}
