import {
  formatAddressToAssetId,
  formatChainIdToCaip,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { CaipAssetType, CaipChainId } from '@metamask/utils';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import { BridgeToken } from '../../types';
import { normalizeEvmAssetId } from '../../utils/tokenUtils';

export const MAX_BATCH_SELL_SOURCE_TOKENS = 5;
// TODO: The fetching of 7702 chains needs to be dynamic so there's no need for
// a new build when the Sentinel team decides to extend support to other chains
// (e.g., Avalanche). That said, for v1 we can go with a hard-coded list and then
// do a fast-follow to update the logic.
export const SUPPORTED_BATCH_SELL_CHAIN_IDS: CaipChainId[] = [
  'eip155:1',
  'eip155:56',
  'eip155:8453',
  'eip155:59144',
  'eip155:42161',
  'eip155:137',
];

interface BatchSellEligibleChain {
  chainId: CaipChainId;
  name: string;
  tokenFiatAmount: number;
}

export type BatchSellTokenSortDirection = 'asc' | 'desc';

function getTokenAssetId(token: BridgeToken): CaipAssetType | undefined {
  const assetId = formatAddressToAssetId(token.address, token.chainId);
  return assetId ? normalizeEvmAssetId(assetId) : undefined;
}

/**
 * Returns the first destination stablecoin for a chain that has local metadata.
 */
export function getBatchSellDestinationToken(
  chainId: BridgeToken['chainId'],
  stablecoins: BridgeToken[],
): BridgeToken | undefined {
  const caipChainId = formatChainIdToCaip(chainId);

  return stablecoins.find(
    (stablecoin) => formatChainIdToCaip(stablecoin.chainId) === caipChainId,
  );
}

export function removeStablecoinsFromSourceTokens({
  tokens,
  stablecoins,
}: {
  tokens: BridgeToken[];
  stablecoins: BridgeToken[];
}): BridgeToken[] {
  const stablecoinAssetIds = new Set(
    stablecoins
      .map((stablecoin) => getTokenAssetId(stablecoin))
      .filter((assetId): assetId is CaipAssetType => Boolean(assetId)),
  );

  return tokens.filter((token) => {
    const assetId = getTokenAssetId(token);

    if (!assetId) {
      return true;
    }

    return !stablecoinAssetIds.has(assetId);
  });
}

export function sortBatchSellTokens(
  tokens: BridgeToken[],
  sortDirection: BatchSellTokenSortDirection = 'desc',
): BridgeToken[] {
  return [...tokens].sort((tokenA, tokenB) => {
    const fiatAmountA = tokenA.tokenFiatAmount ?? 0;
    const fiatAmountB = tokenB.tokenFiatAmount ?? 0;

    if (fiatAmountA !== fiatAmountB) {
      return sortDirection === 'desc'
        ? fiatAmountB - fiatAmountA
        : fiatAmountA - fiatAmountB;
    }

    return tokenA.symbol.localeCompare(tokenB.symbol);
  });
}

/**
 * Groups sellable tokens by chain and totals their fiat value so the UI can
 * show eligible network pills ordered by the user's highest-value networks.
 */
export function buildBatchSellEligibleChains(
  tokens: BridgeToken[],
): BatchSellEligibleChain[] {
  const tokenFiatAmountsByChain = new Map<CaipChainId, number>();

  for (const token of tokens) {
    const caipChainId = formatChainIdToCaip(token.chainId);
    const currentChainFiatAmount =
      tokenFiatAmountsByChain.get(caipChainId) ?? 0;
    const tokenFiatAmount = token.tokenFiatAmount ?? 0;
    const nextChainFiatAmount = currentChainFiatAmount + tokenFiatAmount;

    tokenFiatAmountsByChain.set(caipChainId, nextChainFiatAmount);
  }

  return Array.from(tokenFiatAmountsByChain.entries())
    .map(([chainId, tokenFiatAmount]) => ({
      chainId,
      name:
        NETWORK_TO_SHORT_NETWORK_NAME_MAP[formatChainIdToHex(chainId)] ??
        chainId,
      tokenFiatAmount,
    }))
    .sort((chainA, chainB) => {
      // Sort by highest aggregate fiat value first
      if (chainA.tokenFiatAmount !== chainB.tokenFiatAmount) {
        return chainB.tokenFiatAmount - chainA.tokenFiatAmount;
      }

      // Then sort by network name alphabetically
      return chainA.name.localeCompare(chainB.name);
    });
}
