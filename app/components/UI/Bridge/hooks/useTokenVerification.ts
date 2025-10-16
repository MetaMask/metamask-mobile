import { useMemo } from 'react';
import { BridgeToken } from '../types';
import { isTokenVerified } from '../utils/verifiedTokens';

/**
 * Hook to check if a single token is verified
 * @param token - The token to check
 * @returns true if the token is verified, false otherwise
 */
export const useTokenVerification = (
  token: BridgeToken | null | undefined,
): boolean => useMemo(() => {
    if (!token) return false;
    return isTokenVerified(token.address, token.chainId);
  }, [token]);

/**
 * Hook to enhance multiple tokens with verification status
 * @param tokens - Array of tokens to check
 * @returns Array of tokens with isVerified property added
 */
export const useTokensWithVerification = (
  tokens: BridgeToken[],
): (BridgeToken & { isVerified: boolean })[] => useMemo(
    () =>
      tokens.map((token) => ({
        ...token,
        isVerified: isTokenVerified(token.address, token.chainId),
      })),
    [tokens],
  );

/**
 * Hook to filter only verified tokens
 * @param tokens - Array of tokens to filter
 * @returns Array of only verified tokens
 */
export const useVerifiedTokens = (tokens: BridgeToken[]): BridgeToken[] => useMemo(
    () =>
      tokens.filter((token) => isTokenVerified(token.address, token.chainId)),
    [tokens],
  );
