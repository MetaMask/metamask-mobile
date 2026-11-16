import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectEvmAssetIdResolver } from '../../../../../selectors/assets/assets-controller';
import {
  getPaymentTokenEvmAsset,
  isSameAssetId,
} from '../../../../../util/transactions/payment-token';
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
  const resolveAssetId = useSelector(selectEvmAssetIdResolver);
  const automaticToken = useAutomaticTransactionPayToken({
    preferredToken,
    disable: true,
  });

  const isSelectedDistinctFromAutomatic = useMemo(() => {
    if (!payToken || !automaticToken) {
      return false;
    }
    return !isSameAssetId(payToken.assetId, resolveAssetId(automaticToken));
  }, [automaticToken, payToken, resolveAssetId]);

  const selectedToken = useMemo<PayWithSelectedToken | undefined>(() => {
    const payTokenAsset = getPaymentTokenEvmAsset(payToken);

    if (!payToken || !payTokenAsset) {
      return undefined;
    }
    return {
      ...payTokenAsset,
      balanceUsd: payToken.balanceUsd,
      symbol: payToken.symbol,
    };
  }, [payToken]);

  const selectToken = useCallback(
    (target: SetPayTokenRequest) => {
      const assetId = resolveAssetId(target);

      if (isSameAssetId(payToken?.assetId, assetId)) {
        return;
      }
      setPayToken({ assetId });
    },
    [payToken, resolveAssetId, setPayToken],
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
