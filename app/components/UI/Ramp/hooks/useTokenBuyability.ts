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

interface UseTokensBuyabilityResult {
  isBuyableByToken: boolean[];
  isLoading: boolean;
}

interface BuyabilityTokenSource {
  assetId?: string;
  chainId?: string;
  tokenSupported?: boolean;
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

function getIsTokenBuyable(
  token: TokenI,
  rampsTokens: BuyabilityTokenSource[] | null,
): boolean {
  if (!rampsTokens) {
    return false;
  }

  const chainId = isCaipChainId(token.chainId)
    ? token.chainId
    : toEvmCaipChainId(token.chainId as Hex);
  const assetId = buildRampAssetId(token);
  const isNative = token.isNative ?? false;

  const match = rampsTokens.find((rampToken) => {
    if (!rampToken.assetId) {
      return false;
    }

    if (isNative) {
      return (
        rampToken.chainId === chainId && rampToken.assetId.includes('/slip44:')
      );
    }

    return assetId
      ? rampToken.assetId.toLowerCase() === assetId.toLowerCase()
      : false;
  });

  return match?.tokenSupported ?? false;
}

/**
 * Hook that determines if tokens can be bought via ramp services.
 * When unified V2 is enabled, checks against the RampsController's token list.
 * When V2 is disabled, uses the legacy token cache API.
 */
export const useTokensBuyability = (
  tokens: TokenI[],
): UseTokensBuyabilityResult => {
  const isV2Enabled = useRampsUnifiedV2Enabled();
  const { allTokens: legacyAllTokens, isLoading: legacyLoading } =
    useRampTokens({
      fetchOnMount: !isV2Enabled,
    });
  const { tokens: controllerTokens, isLoading: controllerLoading } =
    useRampsTokens();

  const isLoading = isV2Enabled ? controllerLoading : legacyLoading;

  const rampsTokens = isV2Enabled
    ? controllerTokens?.allTokens
    : legacyAllTokens;
  const isBuyableByToken = useMemo(
    () => tokens.map((token) => getIsTokenBuyable(token, rampsTokens ?? null)),
    [tokens, rampsTokens],
  );

  return { isBuyableByToken, isLoading };
};

/**
 * Hook that determines if a token can be bought via ramp services.
 * Wrapper around useTokensBuyability for backwards compatibility.
 */
export const useTokenBuyability = (token: TokenI): UseTokenBuyabilityResult => {
  const { isBuyableByToken, isLoading } = useTokensBuyability([token]);
  return { isBuyable: isBuyableByToken[0] ?? false, isLoading };
};

export default useTokenBuyability;
