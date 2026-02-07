import { useMemo } from 'react';
import { Hex, isCaipChainId } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { useRampTokens, RampsToken } from '../../Ramp/hooks/useRampTokens';
import { useRampsTokens } from '../../Ramp/hooks/useRampsTokens';
import useRampsUnifiedV2Enabled from '../../Ramp/hooks/useRampsUnifiedV2Enabled';
import { toAssetId } from '../../Bridge/hooks/useAssetMetadata/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { parseCAIP19AssetId } from '../../Ramp/Aggregator/utils/parseCaip19AssetId';
import { toLowerCaseEquals } from '../../../../util/general';

export interface UseTokenBuyabilityResult {
  isBuyable: boolean;
  isLoading: boolean;
}

/**
 * Checks if a token exists and is supported in a list of ramp tokens.
 */
function isTokenInRampsList(
  token: TokenI,
  rampTokens: RampsToken[],
  chainIdInCaip: string,
  assetId: string | undefined,
): boolean {
  const matchingToken = rampTokens.find((rampsToken) => {
    if (!rampsToken.assetId) return false;

    const parsedTokenAssetId = parseCAIP19AssetId(rampsToken.assetId);
    if (!parsedTokenAssetId) return false;

    if (token.isNative) {
      return (
        rampsToken.chainId === chainIdInCaip &&
        parsedTokenAssetId.assetNamespace === 'slip44'
      );
    }

    return assetId && toLowerCaseEquals(rampsToken.assetId, assetId);
  });
  return matchingToken?.tokenSupported ?? false;
}

/**
 * Hook that determines if a token can be bought via ramp services.
 * When unified V2 is enabled, checks against the RampsController's token list.
 * Otherwise, falls back to the legacy token cache API.
 */
export const useTokenBuyability = (token: TokenI): UseTokenBuyabilityResult => {
  const isV2Enabled = useRampsUnifiedV2Enabled();
  const { allTokens: legacyAllTokens, isLoading: legacyLoading } =
    useRampTokens();
  const { tokens: controllerTokens, isLoading: controllerLoading } =
    useRampsTokens();

  const allTokens = isV2Enabled
    ? (controllerTokens?.allTokens as RampsToken[] | undefined)
    : legacyAllTokens;
  const isLoading = isV2Enabled ? controllerLoading : legacyLoading;

  const isBuyable = useMemo(() => {
    if (!allTokens) return false;

    const chainIdInCaip = isCaipChainId(token.chainId)
      ? token.chainId
      : toEvmCaipChainId(token.chainId as Hex);
    const assetId = toAssetId(token.address, chainIdInCaip);

    return isTokenInRampsList(token, allTokens, chainIdInCaip, assetId);
  }, [allTokens, token]);

  return { isBuyable, isLoading };
};

export default useTokenBuyability;
