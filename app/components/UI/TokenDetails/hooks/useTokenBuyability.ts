import { useMemo } from 'react';
import { Hex, isCaipChainId, isCaipAssetType } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { useRampTokens, RampsToken } from '../../Ramp/hooks/useRampTokens';
import { useRampsTokens } from '../../Ramp/hooks/useRampsTokens';
import useRampsUnifiedV2Enabled from '../../Ramp/hooks/useRampsUnifiedV2Enabled';
import { toAssetId } from '../../Bridge/hooks/useAssetMetadata/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { parseCAIP19AssetId } from '../../Ramp/Aggregator/utils/parseCaip19AssetId';
import { toLowerCaseEquals } from '../../../../util/general';
import parseRampIntent from '../../Ramp/utils/parseRampIntent';
import { getDecimalChainId } from '../../../../util/networks';

export interface UseTokenBuyabilityResult {
  isBuyable: boolean;
  isLoading: boolean;
}

/**
 * Constructs the assetId the same way useTokenActions.onBuy does,
 * which is the assetId that gets passed to setSelectedToken.
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
 * When unified V2 is enabled, checks against the RampsController's token list
 * using the exact same assetId format and matching as setSelectedToken.
 * Otherwise, falls back to the legacy token cache API.
 */
export const useTokenBuyability = (token: TokenI): UseTokenBuyabilityResult => {
  const isV2Enabled = useRampsUnifiedV2Enabled();
  const { allTokens: legacyAllTokens, isLoading: legacyLoading } =
    useRampTokens();
  const { tokens: controllerTokens, isLoading: controllerLoading } =
    useRampsTokens();

  const isLoading = isV2Enabled ? controllerLoading : legacyLoading;

  const isBuyable = useMemo(() => {
    if (isV2Enabled) {
      // V2: exact match against controller tokens, same as setSelectedToken
      const v2Tokens = controllerTokens?.allTokens;
      if (!v2Tokens) return false;

      const assetId = buildRampAssetId(token);
      if (!assetId) return false;

      const matchingToken = v2Tokens.find((tok) => tok.assetId === assetId);
      return (matchingToken as RampsToken | undefined)?.tokenSupported ?? false;
    }

    // V1 legacy: case-insensitive with native token handling
    if (!legacyAllTokens) return false;

    const chainIdInCaip = isCaipChainId(token.chainId)
      ? token.chainId
      : toEvmCaipChainId(token.chainId as Hex);
    const assetId = toAssetId(token.address, chainIdInCaip);

    const matchingToken = legacyAllTokens.find((rampsToken) => {
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
  }, [isV2Enabled, controllerTokens, legacyAllTokens, token]);

  return { isBuyable, isLoading };
};

export default useTokenBuyability;
