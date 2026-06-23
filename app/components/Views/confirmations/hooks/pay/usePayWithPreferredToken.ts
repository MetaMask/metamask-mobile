import { useMemo } from 'react';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { SetPayTokenRequest } from './useAutomaticTransactionPayToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { isMatchingPayToken } from '../../utils/transaction-pay';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';

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
  const { payToken } = useTransactionPayToken();
  const { availableTokens, hasTokens } = useTransactionPayAvailableTokens();
  const { balanceUsd: liveBalanceUsd } = usePayTokenAccountBalance();

  const highestBalanceToken = useMemo(() => {
    const heldOverrideToken = preferredToken
      ? availableTokens.find((token) =>
          isMatchingPayToken(token, preferredToken),
        )
      : undefined;

    if (heldOverrideToken?.chainId && !heldOverrideToken.disabled) {
      return heldOverrideToken;
    }

    return [...availableTokens]
      .filter((token) => Boolean(token.chainId) && !token.disabled)
      .sort((a, b) => (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0))[0];
  }, [availableTokens, preferredToken]);

  const preferredTokenCandidate = useMemo(() => {
    if (!highestBalanceToken?.chainId) {
      return undefined;
    }

    if (payToken && isMatchingPayToken(highestBalanceToken, payToken)) {
      return {
        address: payToken.address,
        balanceUsd: liveBalanceUsd,
        chainId: payToken.chainId,
        symbol: payToken.symbol,
      };
    }

    return {
      address: highestBalanceToken.address as Hex,
      balanceUsd: `${highestBalanceToken.fiat?.balance ?? 0}`,
      chainId: highestBalanceToken.chainId as Hex,
      symbol: highestBalanceToken.symbol,
    };
  }, [highestBalanceToken, liveBalanceUsd, payToken]);

  return useMemo(
    () => ({
      hasTokens,
      preferredToken: preferredTokenCandidate,
      selectedToken: payToken,
    }),
    [hasTokens, payToken, preferredTokenCandidate],
  );
}
