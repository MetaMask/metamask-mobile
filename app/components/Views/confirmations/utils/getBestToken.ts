import { Hex } from 'viem';
import { AssetType } from '../types/token';
import { PreferredToken } from '../../../../selectors/featureFlagController/confirmations';

export interface SetPayTokenRequest {
  address: Hex;
  chainId: Hex;
}

export interface GetBestTokenParams {
  isHardwareWallet: boolean;
  isWithdraw: boolean;
  lastWithdrawToken?: SetPayTokenRequest;
  preferredToken?: SetPayTokenRequest;
  preferredTokensFromFlags: PreferredToken[];
  minimumRequiredTokenBalance: number;
  targetToken?: { address: Hex; chainId: Hex };
  tokens: AssetType[];
}

export function getBestToken({
  isHardwareWallet,
  isWithdraw,
  lastWithdrawToken,
  preferredToken,
  preferredTokensFromFlags,
  minimumRequiredTokenBalance,
  targetToken,
  tokens,
}: GetBestTokenParams): { address: Hex; chainId: Hex } | undefined {
  const targetTokenFallback = targetToken
    ? {
        address: targetToken.address,
        chainId: targetToken.chainId,
      }
    : undefined;

  if (isHardwareWallet) {
    return targetTokenFallback;
  }

  if (isWithdraw && lastWithdrawToken) {
    const lastWithdrawTokenAvailable = tokens.some(
      (token) =>
        token.address.toLowerCase() ===
          lastWithdrawToken.address.toLowerCase() &&
        token.chainId?.toLowerCase() ===
          lastWithdrawToken.chainId.toLowerCase(),
    );

    if (lastWithdrawTokenAvailable) {
      return lastWithdrawToken;
    }
  }

  if (preferredToken) {
    const preferredTokenAvailable = tokens.some(
      (token) =>
        token.address.toLowerCase() === preferredToken.address.toLowerCase() &&
        token.chainId?.toLowerCase() === preferredToken.chainId.toLowerCase(),
    );

    if (preferredTokenAvailable) {
      return preferredToken;
    }
  }

  if (preferredTokensFromFlags.length) {
    const sorted = [...preferredTokensFromFlags].sort(
      (a, b) => b.successRate - a.successRate,
    );

    for (const preferred of sorted) {
      const matchingToken = tokens.find(
        (token) =>
          token.address.toLowerCase() === preferred.address.toLowerCase() &&
          token.chainId?.toLowerCase() === preferred.chainId.toLowerCase(),
      );

      if (matchingToken) {
        if (isWithdraw) {
          return {
            address: matchingToken.address as Hex,
            chainId: matchingToken.chainId as Hex,
          };
        }

        const fiatBalance = matchingToken.fiat?.balance ?? 0;

        if (fiatBalance >= minimumRequiredTokenBalance) {
          return {
            address: matchingToken.address as Hex,
            chainId: matchingToken.chainId as Hex,
          };
        }
      }
    }
  }

  if (tokens?.length) {
    if (isWithdraw) {
      return undefined;
    }

    return {
      address: tokens[0].address as Hex,
      chainId: tokens[0].chainId as Hex,
    };
  }

  return targetTokenFallback;
}
