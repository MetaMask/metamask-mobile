import { useMemo } from 'react';
import { Hex, isCaipChainId, isCaipAssetType } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { useRampTokens, RampsToken } from './useRampTokens';
import { useRampsTokens } from './useRampsTokens';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';
import { toAssetId } from '../../Bridge/hooks/useAssetMetadata/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { parseCAIP19AssetId } from '../Aggregator/utils/parseCaip19AssetId';
import { toLowerCaseEquals } from '../../../../util/general';
import parseRampIntent from '../utils/parseRampIntent';
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
 * When unified V2 is enabled, checks only against the RampsController's token list
 * using the exact same assetId format and matching as setSelectedToken.
 * When V2 is disabled, uses the legacy token cache API.
 */
export const useTokenBuyability = (token: TokenI): UseTokenBuyabilityResult => {
  const isV2Enabled = useRampsUnifiedV2Enabled();
  const { allTokens: legacyAllTokens, isLoading: legacyLoading } =
    useRampTokens();
  const { tokens: controllerTokens, isLoading: controllerLoading } =
    useRampsTokens();

  const isLoading = isV2Enabled ? controllerLoading : legacyLoading;
  const v2Tokens = controllerTokens?.allTokens;

  const isBuyable = useMemo(() => {
    if (isV2Enabled) {
      // V2: match against controller tokens
      if (!v2Tokens) return false;

      const chainIdInCaip = isCaipChainId(token.chainId)
        ? token.chainId
        : toEvmCaipChainId(token.chainId as Hex);

      let matchingToken;

      if (token.isNative) {
        // Native tokens: parseRampIntent uses 'slip44:.' placeholder but
        // the API returns the actual coin type (e.g. 'slip44:60').
        // Match by chainId + slip44 namespace instead of exact assetId.
        matchingToken = v2Tokens.find((tok) => {
          if (tok.chainId !== chainIdInCaip || !tok.assetId) return false;
          return tok.assetId.includes('/slip44:');
        });
      } else {
        // ERC20 tokens: case-insensitive match (API returns lowercase,
        // parseRampIntent returns checksummed)
        const assetId = buildRampAssetId(token);
        if (!assetId) return false;
        const lowerAssetId = assetId.toLowerCase();
        matchingToken = v2Tokens.find(
          (tok) => tok.assetId?.toLowerCase() === lowerAssetId,
        );
      }

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
  }, [isV2Enabled, v2Tokens, legacyAllTokens, token]);

  return { isBuyable, isLoading };
};

export default useTokenBuyability;
