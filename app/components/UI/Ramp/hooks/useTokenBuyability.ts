import { useMemo } from 'react';
import { Hex, isCaipChainId, isCaipAssetType } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { useRampTokens } from './useRampTokens';
import { useRampsTokens } from './useRampsTokens';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import parseRampIntent from '../utils/parseRampIntent';
import { getDecimalChainId } from '../../../../util/networks';

export interface UseTokenBuyabilityResult {
  isBuyable: boolean;
  isLoading: boolean;
}

interface RampTokenLike {
  assetId?: string;
  chainId?: string;
  tokenSupported?: boolean;
}

/**
 * Finds a matching ramp token from a list.
 * Native tokens: matches by chainId + slip44 namespace.
 * ERC20 tokens: matches by case-insensitive assetId.
 */
function findMatchingRampToken(
  tokens: RampTokenLike[],
  chainId: string,
  assetId: string | undefined,
  isNative: boolean,
): RampTokenLike | undefined {
  return tokens.find((tok) => {
    if (!tok.assetId) return false;

    if (isNative) {
      return tok.chainId === chainId && tok.assetId.includes('/slip44:');
    }

    return assetId
      ? tok.assetId.toLowerCase() === assetId.toLowerCase()
      : false;
  });
}

/**
 * Builds the CAIP-19 assetId for a token, matching the format used by
 * useTokenActions.onBuy when navigating to the ramp flow.
 */
function buildRampAssetId(token: TokenI): string | undefined {
  try {
    if (isCaipAssetType(token.address)) {
      return token.address;
    }
    return parseRampIntent({
      chainId: getDecimalChainId(token.chainId),
      address: token.address,
    })?.assetId;
  } catch {
    return undefined;
  }
}

/**
 * Hook that determines if a token can be bought via ramp services.
 * When unified V2 is enabled, checks against the RampsController's token list.
 * When V2 is disabled, uses the legacy token cache API.
 */
export const useTokenBuyability = (token: TokenI): UseTokenBuyabilityResult => {
  const isV2Enabled = useRampsUnifiedV2Enabled();
  const { allTokens: legacyAllTokens, isLoading: legacyLoading } =
    useRampTokens();
  const { tokens: controllerTokens, isLoading: controllerLoading } =
    useRampsTokens();

  const isLoading = isV2Enabled ? controllerLoading : legacyLoading;

  const isBuyable = useMemo(() => {
    const tokens = isV2Enabled ? controllerTokens?.allTokens : legacyAllTokens;

    if (!tokens) return false;

    const chainId = isCaipChainId(token.chainId)
      ? token.chainId
      : toEvmCaipChainId(token.chainId as Hex);

    const assetId = buildRampAssetId(token);
    const isNative = token.isNative ?? false;

    const match = findMatchingRampToken(tokens, chainId, assetId, isNative);
    return match?.tokenSupported ?? false;
  }, [isV2Enabled, controllerTokens, legacyAllTokens, token]);

  return { isBuyable, isLoading };
};

export default useTokenBuyability;
