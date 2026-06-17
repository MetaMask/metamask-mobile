import { useMemo } from 'react';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import {
  SetPayTokenRequest,
  useAutomaticTransactionPayToken,
} from './useAutomaticTransactionPayToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { isMatchingPayToken } from '../../utils/transaction-pay';

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
  const { availableTokens, hasTokens } = useTransactionPayAvailableTokens();

  const preferredTokenCandidate = useMemo(() => {
    if (!automaticToken) {
      return undefined;
    }

    const selectedToken = payToken;

    if (selectedToken && isMatchingPayToken(selectedToken, automaticToken)) {
      return {
        address: selectedToken.address,
        balanceUsd: selectedToken.balanceUsd,
        chainId: selectedToken.chainId,
        symbol: selectedToken.symbol,
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
      balanceUsd: `${availableToken.fiat?.balance ?? 0}`,
      chainId: availableToken.chainId as Hex,
      symbol: availableToken.symbol,
    };
  }, [automaticToken, availableTokens, payToken]);

  return useMemo(
    () => ({
      hasTokens,
      preferredToken: preferredTokenCandidate,
      selectedToken: payToken,
    }),
    [hasTokens, payToken, preferredTokenCandidate],
  );
}
