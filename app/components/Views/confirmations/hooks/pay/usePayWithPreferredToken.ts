import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from './useAutomaticTransactionPayToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { isMatchingPayToken, payBalanceUsd } from '../../utils/transaction-pay';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { selectEvmAssetIdResolver } from '../../../../../selectors/assets/assets-controller';
import {
  getPaymentTokenEvmAsset,
  isSameAssetId,
} from '../../../../../util/transactions/payment-token';

export interface PayWithPreferredToken {
  address: Hex;
  balanceUsd: string;
  chainId: Hex;
  symbol: string;
}

export interface UsePayWithPreferredTokenResult {
  hasTokens: boolean;
  preferredToken: PayWithPreferredToken | undefined;
  selectedToken: TransactionPaymentToken | undefined;
}

export function usePayWithPreferredToken({
  preferredToken,
}: {
  preferredToken?: SetPayTokenRequest;
} = {}): UsePayWithPreferredTokenResult {
  const automaticToken = useAutomaticTransactionPayToken({
    preferredToken,
  });

  const { payToken } = useTransactionPayToken();
  const resolveAssetId = useSelector(selectEvmAssetIdResolver);
  const { availableTokens, hasTokens } = useTransactionPayAvailableTokens();
  const { balanceUsd: liveBalanceUsd } = usePayTokenAccountBalance();

  const preferredTokenCandidate = useMemo(() => {
    if (!automaticToken) {
      return undefined;
    }

    const payTokenAsset = getPaymentTokenEvmAsset(payToken);

    if (
      payToken &&
      payTokenAsset &&
      isSameAssetId(payToken.assetId, resolveAssetId(automaticToken))
    ) {
      return {
        ...payTokenAsset,
        balanceUsd: liveBalanceUsd,
        symbol: payToken.symbol,
      };
    }

    const availableToken = availableTokens.find((token) =>
      isMatchingPayToken(token, automaticToken),
    );

    if (!availableToken?.chainId) {
      return undefined;
    }

    return {
      address: availableToken.address as Hex,
      balanceUsd: payBalanceUsd(availableToken.balanceInSelectedCurrencyAmount),
      chainId: availableToken.chainId as Hex,
      symbol: availableToken.symbol,
    };
  }, [
    automaticToken,
    availableTokens,
    liveBalanceUsd,
    payToken,
    resolveAssetId,
  ]);

  return useMemo(
    () => ({
      hasTokens,
      preferredToken: preferredTokenCandidate,
      selectedToken: payToken,
    }),
    [hasTokens, payToken, preferredTokenCandidate],
  );
}
