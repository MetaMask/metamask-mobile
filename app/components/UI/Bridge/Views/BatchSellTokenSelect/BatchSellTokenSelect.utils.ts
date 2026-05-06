import {
  formatAddressToAssetId,
  formatChainIdToCaip,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import {
  CaipAssetType,
  CaipChainId,
  parseCaipAssetType,
} from '@metamask/utils';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import { BridgeToken } from '../../types';
import { BridgeTokenMetadata } from '../../constants/tokens';

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

export interface BatchSellEligibleChain {
  chainId: CaipChainId;
  name: string;
  tokenFiatAmount: number;
}

export type BatchSellTokenSortDirection = 'asc' | 'desc';

function getChecksummedEvmAssetId(assetId: CaipAssetType): CaipAssetType {
  try {
    const { assetNamespace, assetReference, chainId } =
      parseCaipAssetType(assetId);

    if (assetNamespace !== 'erc20' || !chainId.startsWith('eip155:')) {
      return assetId;
    }

    return formatAddressToAssetId(assetReference, chainId) ?? assetId;
  } catch {
    return assetId;
  }
}

export function getBatchSellDestinationToken(
  sourceToken: BridgeToken,
  stablecoinsByChain: Record<CaipChainId, CaipAssetType[]>,
): BridgeToken | undefined {
  const caipChainId = formatChainIdToCaip(sourceToken.chainId);
  const stablecoinAssetIds = stablecoinsByChain[caipChainId] ?? [];

  for (const stablecoinAssetId of stablecoinAssetIds) {
    const tokenMetadata = BridgeTokenMetadata[stablecoinAssetId];

    if (tokenMetadata) {
      return tokenMetadata;
    }
  }

  return undefined;
}

export function removeStablecoinsFromSourceTokens({
  tokens,
  stablecoinsByChain,
}: {
  tokens: BridgeToken[];
  stablecoinsByChain: Record<CaipChainId, CaipAssetType[]>;
}): BridgeToken[] {
  return tokens.filter((token) => {
    const caipChainId = formatChainIdToCaip(token.chainId);
    const assetId = formatAddressToAssetId(token.address, token.chainId); // returns checksummed EVM asset IDs

    if (!assetId) {
      return true;
    }

    const stablecoinAssetIds = stablecoinsByChain[caipChainId] ?? [];
    const checksummedStablecoinAssetIds = stablecoinAssetIds.map(
      getChecksummedEvmAssetId,
    );
    const isDestinationStablecoin =
      checksummedStablecoinAssetIds.includes(assetId);

    return !isDestinationStablecoin;
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
