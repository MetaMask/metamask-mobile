import type { TokenAsset } from '@metamask/assets-controllers';
import {
  formatAddressToAssetId,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';

import type { BridgeToken } from '../../types';
import {
  MAX_BATCH_SELL_SOURCE_TOKENS,
  SUPPORTED_BATCH_SELL_CHAIN_IDS,
  sortBatchSellTokens,
} from '../BatchSellTokenSelect/BatchSellTokenSelect.utils';

export interface PortfolioPlanRequest {
  category: 'meme';
  destinationSymbol: string;
}

export interface WalletAssistantPortfolioPlan {
  destinationSymbol: string;
  excludedSourceCount: number;
  sourceChainId?: CaipChainId;
  sourceTokens: BridgeToken[];
  status: 'ready' | 'no-matches' | 'unsupported-target';
}

const PORTFOLIO_ACTION =
  /\b(?:move|convert|swap|sell|exit|consolidate|roll)\b[\s\S]*\b(?:all|my)\b[\s\S]*\b(?:meme\s*coins?|memecoins?)\b/i;
const DESTINATION =
  /\b(?:into|to|for)\s+(?:the\s+)?([a-z0-9][a-z0-9 ._-]{1,40})[.!?]?\s*$/i;
const MEME_LABEL = /meme/i;
const NVIDIA = /\b(?:nvidia|nvda)(?:\s+stock)?\b/i;

export const parsePortfolioPlanRequest = (
  prompt: string,
): PortfolioPlanRequest | undefined => {
  if (!PORTFOLIO_ACTION.test(prompt)) {
    return undefined;
  }

  const destinationPhrase = DESTINATION.exec(prompt)?.[1]?.trim() ?? '';
  const destinationSymbol = NVIDIA.test(destinationPhrase)
    ? 'NVDA'
    : (destinationPhrase.split(/\s+/)[0]?.toUpperCase() ?? '');

  return destinationSymbol
    ? { category: 'meme', destinationSymbol }
    : undefined;
};

export const getWalletTokenAssetId = (
  token: BridgeToken,
): CaipAssetType | undefined =>
  formatAddressToAssetId(token.address, token.chainId);

export const getTokenLabelsByAssetId = (
  assets: readonly TokenAsset[],
): ReadonlyMap<string, readonly string[]> =>
  new Map(
    assets.map((asset) => [asset.assetId.toLowerCase(), asset.labels ?? []]),
  );

const isMemeToken = (
  token: BridgeToken,
  labelsByAssetId: ReadonlyMap<string, readonly string[]>,
) => {
  const assetId = getWalletTokenAssetId(token);
  return Boolean(
    assetId &&
      labelsByAssetId
        .get(assetId.toLowerCase())
        ?.some((label) => MEME_LABEL.test(label)),
  );
};

const getDestinationForChain = (
  destinationSymbol: string,
  chainId: CaipChainId,
  destinationTokensByChain: Partial<Record<CaipChainId, BridgeToken[]>>,
) =>
  destinationTokensByChain[chainId]?.find(
    (token) =>
      token.symbol.trim().toUpperCase() === destinationSymbol.toUpperCase(),
  );

export const buildPortfolioPlan = ({
  destinationTokensByChain,
  labelsByAssetId,
  request,
  walletTokens,
}: {
  destinationTokensByChain: Partial<Record<CaipChainId, BridgeToken[]>>;
  labelsByAssetId: ReadonlyMap<string, readonly string[]>;
  request: PortfolioPlanRequest;
  walletTokens: readonly BridgeToken[];
}): WalletAssistantPortfolioPlan => {
  const supportedChains = new Set(SUPPORTED_BATCH_SELL_CHAIN_IDS);
  const matchingTokens = walletTokens.filter(
    (token) =>
      Number(token.balance ?? 0) > 0 &&
      !token.rwaData &&
      supportedChains.has(formatChainIdToCaip(token.chainId)) &&
      token.symbol.toUpperCase() !== request.destinationSymbol &&
      isMemeToken(token, labelsByAssetId),
  );

  if (matchingTokens.length === 0) {
    return {
      destinationSymbol: request.destinationSymbol,
      excludedSourceCount: 0,
      sourceTokens: [],
      status: 'no-matches',
    };
  }

  const tokensByChain = new Map<CaipChainId, BridgeToken[]>();
  matchingTokens.forEach((token) => {
    const chainId = formatChainIdToCaip(token.chainId);
    tokensByChain.set(chainId, [...(tokensByChain.get(chainId) ?? []), token]);
  });

  const executableGroups = Array.from(tokensByChain.entries())
    .filter(([chainId]) =>
      Boolean(
        getDestinationForChain(
          request.destinationSymbol,
          chainId,
          destinationTokensByChain,
        ),
      ),
    )
    .sort(
      ([, left], [, right]) =>
        right.reduce(
          (total, token) => total + (token.tokenFiatAmount ?? 0),
          0,
        ) -
        left.reduce((total, token) => total + (token.tokenFiatAmount ?? 0), 0),
    );

  const selectedGroup = executableGroups[0];
  if (!selectedGroup) {
    const fallbackGroup = Array.from(tokensByChain.entries()).sort(
      ([, left], [, right]) =>
        right.reduce(
          (total, token) => total + (token.tokenFiatAmount ?? 0),
          0,
        ) -
        left.reduce((total, token) => total + (token.tokenFiatAmount ?? 0), 0),
    )[0];
    const sourceTokens = fallbackGroup
      ? sortBatchSellTokens(fallbackGroup[1]).slice(
          0,
          MAX_BATCH_SELL_SOURCE_TOKENS,
        )
      : [];

    return {
      destinationSymbol: request.destinationSymbol,
      excludedSourceCount: matchingTokens.length - sourceTokens.length,
      sourceChainId: fallbackGroup?.[0],
      sourceTokens,
      status: 'unsupported-target',
    };
  }

  const [sourceChainId, chainTokens] = selectedGroup;
  const sourceTokens = sortBatchSellTokens(chainTokens).slice(
    0,
    MAX_BATCH_SELL_SOURCE_TOKENS,
  );

  return {
    destinationSymbol: request.destinationSymbol,
    excludedSourceCount: matchingTokens.length - sourceTokens.length,
    sourceChainId,
    sourceTokens,
    status: 'ready',
  };
};
