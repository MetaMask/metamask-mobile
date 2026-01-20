import { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { PREDICT_WITHDRAWAL_SUPPORTED_TOKENS } from '../../constants/predict';
import { AssetType } from '../../types/token';

/**
 * Check if a token matches a supported withdrawal token by address and chainId.
 */
function matchesSupportedToken(
  address: string | undefined,
  chainId: Hex,
): boolean {
  if (!address) return false;
  return PREDICT_WITHDRAWAL_SUPPORTED_TOKENS.some(
    (supported) =>
      supported.address.toLowerCase() === address.toLowerCase() &&
      supported.chainId === chainId,
  );
}

/**
 * Hook that provides token filtering for Predict withdrawals.
 * Returns a filter function that only includes tokens that are
 * in the PREDICT_WITHDRAWAL_SUPPORTED_TOKENS list.
 */
export function usePredictWithdrawalTokens() {
  const filterWithdrawalTokens = useCallback(
    (tokens: AssetType[]) =>
      tokens.filter((token) =>
        matchesSupportedToken(token.address, token.chainId as Hex),
      ),
    [],
  );

  /**
   * Check if a token is a supported withdrawal token
   */
  const isSupportedWithdrawalToken = useCallback(
    (address: Hex, chainId: Hex) => matchesSupportedToken(address, chainId),
    [],
  );

  return {
    filterWithdrawalTokens,
    isSupportedWithdrawalToken,
    supportedTokens: PREDICT_WITHDRAWAL_SUPPORTED_TOKENS,
  };
}
