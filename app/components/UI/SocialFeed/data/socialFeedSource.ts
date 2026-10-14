import {
  isCaipAssetType,
  parseCaipAssetType,
  type CaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import type {
  FetchFeedOptions,
  FetchTokenFeedOptions,
  FetchTraderFeedOptions,
  TokenFeedChain,
} from '@metamask/social-controllers';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import type { FeedAudience } from '../types';
import { chainNameToId } from '../utils/chainMapping';
import { HYPERLIQUID_CHAIN_NAME } from '../utils/perp';

/** Feed scope the social API expects, derived from the audience toggle. */
export type FeedScope = NonNullable<FetchFeedOptions['scope']>;

export const toFeedScope = (audience: FeedAudience): FeedScope =>
  audience === 'following' ? 'following' : 'leaderboard';

/**
 * Which slice of the social feed to show. Plain JSON, so it can also be a
 * query key input and a navigation param.
 */
export type SocialFeedSource =
  /** Every tracked trader (`leaderboard` scope) or the viewer's follows. */
  | { kind: 'all'; audience: FeedAudience }
  /** Positions in one spot token, identified by its CAIP-19 asset id. */
  | { kind: 'token'; assetId: CaipAssetType }
  /** Positions in one Hyperliquid perp market (`BTC`, `xyz:NVDA`). */
  | { kind: 'perp'; symbol: string }
  /** One trader's positions, by wallet address or social profile id. */
  | { kind: 'trader'; addressOrId: string; commentedOnly?: boolean };

type Paged = 'limit' | 'olderThan' | 'newerThan';

/**
 * The messenger call a source resolves to, minus paging. `options` is also
 * what the query key is built from, so two sources that normalise to the same
 * request share one cache entry.
 */
export type SocialFeedRequest =
  | {
      action: 'SocialService:fetchFeed';
      options: Required<Pick<FetchFeedOptions, 'scope'>> & {
        chains: readonly CaipChainId[];
      };
    }
  | {
      action: 'SocialService:fetchTokenFeed';
      options: Omit<FetchTokenFeedOptions, Paged>;
    }
  | {
      action: 'SocialService:fetchTraderFeed';
      options: Omit<FetchTraderFeedOptions, Paged>;
    };

/** Token-route chains that list spot tokens. Hyperliquid is perp-only. */
const TOKEN_FEED_SPOT_CHAINS = [
  'base',
  'bsc',
  'ethereum',
  'robinhood',
  'solana',
] as const satisfies readonly TokenFeedChain[];

const TOKEN_FEED_CHAIN_BY_CAIP2 = new Map<string, TokenFeedChain>(
  TOKEN_FEED_SPOT_CHAINS.flatMap((name) => {
    const caip2 = chainNameToId(name);
    return caip2 ? [[caip2, name] as const] : [];
  }),
);

const NATIVE_ASSET_NAMESPACE = 'slip44';

/** CAIP-19 asset namespace a spot token uses on each chain namespace. */
const TOKEN_ASSET_NAMESPACE: Record<string, string> = {
  eip155: 'erc20',
  solana: 'token',
};

/**
 * The token route matches contracts as exact strings: EVM contracts are
 * stored lowercase, so a checksummed address silently returns an empty feed.
 * Solana mints are base58 and case-sensitive, so they pass through untouched.
 */
const normaliseContractAddress = (
  chainNamespace: string,
  address: string,
): string => (chainNamespace === 'eip155' ? address.toLowerCase() : address);

const toAssetFeedRequest = (assetId: string): SocialFeedRequest | null => {
  if (!isCaipAssetType(assetId)) {
    return null;
  }
  const { chainId, chain, assetNamespace, assetReference } =
    parseCaipAssetType(assetId);

  // A native asset has no contract for the token route, so it gets every
  // trader's activity on its chain instead.
  if (assetNamespace === NATIVE_ASSET_NAMESPACE) {
    return FEED_CAIP2_CHAINS.includes(chainId)
      ? {
          action: 'SocialService:fetchFeed',
          options: { scope: 'leaderboard', chains: [chainId] },
        }
      : null;
  }

  const tokenFeedChain = TOKEN_FEED_CHAIN_BY_CAIP2.get(chainId);
  if (
    !tokenFeedChain ||
    TOKEN_ASSET_NAMESPACE[chain.namespace] !== assetNamespace ||
    !assetReference
  ) {
    return null;
  }
  return {
    action: 'SocialService:fetchTokenFeed',
    options: {
      chain: tokenFeedChain,
      contractAddress: normaliseContractAddress(
        chain.namespace,
        assetReference,
      ),
    },
  };
};

/**
 * Resolves a source to the social-api call that serves it, or `null` when the
 * source has no feed (unsupported chain or asset namespace, blank identifier).
 * A native asset resolves to the global feed filtered to its chain.
 */
export const toSocialFeedRequest = (
  source: SocialFeedSource,
): SocialFeedRequest | null => {
  switch (source.kind) {
    case 'all':
      return {
        action: 'SocialService:fetchFeed',
        options: {
          scope: toFeedScope(source.audience),
          chains: FEED_CAIP2_CHAINS,
        },
      };
    case 'token':
      return toAssetFeedRequest(source.assetId);
    case 'perp': {
      // Perp markets live on the token route under `hyperliquid`, keyed by the
      // exact market symbol (`BTC` matches, `btc` does not).
      const symbol = source.symbol.trim();
      return symbol
        ? {
            action: 'SocialService:fetchTokenFeed',
            options: { chain: HYPERLIQUID_CHAIN_NAME, contractAddress: symbol },
          }
        : null;
    }
    case 'trader': {
      const addressOrId = source.addressOrId.trim();
      if (!addressOrId) {
        return null;
      }
      return {
        action: 'SocialService:fetchTraderFeed',
        options: source.commentedOnly
          ? { addressOrId, commentedOnly: true }
          : { addressOrId },
      };
    }
    default:
      return source satisfies never;
  }
};

/** The asset fields a feed row carries, as the social API names them. */
export interface SocialFeedAssetRef {
  /** Social chain name (`ethereum`, `solana`, `hyperliquid`). */
  chain: string;
  tokenAddress: string;
  /** Raw market id for perps (`BTC`, `xyz:NVDA`); used for Hyperliquid rows. */
  tokenSymbol?: string;
}

/**
 * Builds the source for the asset a feed row is about. Hyperliquid rows become
 * perp sources keyed by their market symbol, because global-feed perp rows can
 * arrive with an empty `tokenAddress`.
 */
export const socialFeedSourceFromAsset = ({
  chain: chainName,
  tokenAddress,
  tokenSymbol,
}: SocialFeedAssetRef): SocialFeedSource | null => {
  const chain = chainName.trim().toLowerCase();
  const address = tokenAddress.trim();
  if (chain === HYPERLIQUID_CHAIN_NAME) {
    const symbol = tokenSymbol?.trim() || address;
    return symbol ? { kind: 'perp', symbol } : null;
  }
  if (!chain || !address) {
    return null;
  }
  const caip2 = chainNameToId(chain);
  if (!caip2) {
    return null;
  }
  const assetNamespace = TOKEN_ASSET_NAMESPACE[caip2.split(':')[0]];
  if (!assetNamespace) {
    return null;
  }
  const assetId = `${caip2}/${assetNamespace}:${address}`;
  return isCaipAssetType(assetId) ? { kind: 'token', assetId } : null;
};
