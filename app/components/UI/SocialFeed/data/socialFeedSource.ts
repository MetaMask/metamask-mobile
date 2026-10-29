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
  SocialFeedRealtimeScope,
  TokenFeedChain,
} from '@metamask/social-controllers';
import {
  FEED_CAIP2_CHAINS,
  HYPERLIQUID_CAIP2_CHAIN_ID,
} from './feed-constants';
import { chainNameToId } from '../utils/chainMapping';
import { HYPERLIQUID_CHAIN_NAME } from '../utils/perp';

/** The feed `SocialService:fetchFeed` serves: `following`, `leaderboard`, `all`, or `trending`. */
export type FeedScope = NonNullable<FetchFeedOptions['scope']>;

/**
 * A slice of the social feed, as `SocialService:fetchFeed` filters it. Plain
 * JSON, so it can also be a query key input and a navigation param.
 */
export interface SocialFeedQuery {
  /** Required: the server serves `following` when it is omitted. */
  scope: FeedScope;
  /**
   * CAIP-2 chains. Omitted means every chain the feed tracks; the server's own
   * default is spot-only and would drop perps.
   */
  chains?: readonly CaipChainId[];
  /**
   * CAIP-19 asset types. Empty means no filter. The API takes 1 to 10 and
   * rejects ids that carry a token id; more than 10 surface as its 400.
   */
  assetIds?: readonly CaipAssetType[];
  /** One trader, by social profile id. */
  profileId?: string;
  /** Only positions the trader commented on. */
  commentedOnly?: boolean;
}

/**
 * Sources still served by the token and trader routes. Each goes once its
 * callers move to a {@link SocialFeedQuery} (`assetIds`, `profileId`).
 */
export type LegacySocialFeedSource =
  /** Positions in one spot token, identified by its CAIP-19 asset id. */
  | { kind: 'token'; assetId: CaipAssetType }
  /** Positions in one Hyperliquid perp market (`BTC`, `xyz:NVDA`). */
  | { kind: 'perp'; symbol: string }
  /** One trader's positions, by wallet address or social profile id. */
  | { kind: 'trader'; addressOrId: string; commentedOnly?: boolean };

/** What `useSocialFeed` loads. */
export type SocialFeedSource = SocialFeedQuery | LegacySocialFeedSource;

export const isSocialFeedQuery = (
  source: SocialFeedSource,
): source is SocialFeedQuery => !('kind' in source);

type Paged = 'limit' | 'olderThan' | 'newerThan';

/**
 * The messenger call a source resolves to, minus paging. `options` is also
 * what the query key is built from, so two sources that normalise to the same
 * request share one cache entry.
 */
export type SocialFeedRequest =
  | {
      action: 'SocialService:fetchFeed';
      options: Required<Pick<FetchFeedOptions, 'scope'>> &
        Pick<FetchFeedOptions, 'profileId' | 'commentedOnly'> & {
          chains: readonly CaipChainId[];
          assetIds?: readonly CaipAssetType[];
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

type FetchFeedRequestOptions = Extract<
  SocialFeedRequest,
  { action: 'SocialService:fetchFeed' }
>['options'];

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
 * The feed matches contracts as exact strings: EVM contracts are stored
 * lowercase, so a checksummed address silently returns an empty feed. Solana
 * mints are base58 and case-sensitive, so they pass through untouched.
 */
const normaliseContractAddress = (
  chainNamespace: string,
  address: string,
): string => (chainNamespace === 'eip155' ? address.toLowerCase() : address);

/**
 * The asset id as the feed stores it, or `null` when it is not a CAIP-19 asset
 * type. Only ERC-20 contracts are lowercased: perp markets (`BTC`, `xyz.NVDA`)
 * and Solana mints are case-sensitive.
 */
const normaliseFeedAssetId = (assetId: string): CaipAssetType | null => {
  if (!isCaipAssetType(assetId)) {
    return null;
  }
  const { chainId, assetNamespace, assetReference } =
    parseCaipAssetType(assetId);
  return assetNamespace === TOKEN_ASSET_NAMESPACE.eip155
    ? `${chainId}/${assetNamespace}:${assetReference.toLowerCase()}`
    : assetId;
};

/**
 * `fetchFeed` options for a query. Asset ids are normalised and those on
 * chains the query does not request are dropped: if none remain, the query
 * has no feed rather than widening to every asset. A blank profile id has no
 * feed either.
 */
const toQueryRequest = ({
  scope,
  chains = FEED_CAIP2_CHAINS,
  assetIds,
  profileId,
  commentedOnly,
}: SocialFeedQuery): SocialFeedRequest | null => {
  const options: FetchFeedRequestOptions = { scope, chains };
  if (assetIds && assetIds.length > 0) {
    const requested = new Set(
      assetIds
        .map(normaliseFeedAssetId)
        .filter(
          (assetId): assetId is CaipAssetType =>
            assetId !== null &&
            chains.includes(parseCaipAssetType(assetId).chainId),
        ),
    );
    if (requested.size === 0) {
      return null;
    }
    options.assetIds = [...requested];
  }
  if (profileId !== undefined) {
    const trimmed = profileId.trim();
    if (!trimmed) {
      return null;
    }
    options.profileId = trimmed;
  }
  if (commentedOnly) {
    options.commentedOnly = true;
  }
  return { action: 'SocialService:fetchFeed', options };
};

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

const toLegacyRequest = (
  source: LegacySocialFeedSource,
): SocialFeedRequest | null => {
  switch (source.kind) {
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

/**
 * Resolves a source to the social-api call that serves it, or `null` when the
 * source has no feed (unsupported chain or asset namespace, blank identifier).
 * A query always sends `chains`: without it the server falls back to
 * spot-only chains.
 */
export const toSocialFeedRequest = (
  source: SocialFeedSource,
): SocialFeedRequest | null =>
  isSocialFeedQuery(source) ? toQueryRequest(source) : toLegacyRequest(source);

const coversEveryFeedChain = (chains: readonly CaipChainId[]): boolean =>
  FEED_CAIP2_CHAINS.every((chain) => chains.includes(chain));

/**
 * The socket channel that streams a request, or `null` when none does. Only
 * an unnarrowed `all` or `trending` feed qualifies: socket events are not
 * filtered by chain, asset or trader, so a narrowed feed would receive rows
 * it should not show. There is no channel for `following` or `leaderboard`.
 */
export const toSocialFeedRealtimeScope = (
  request: SocialFeedRequest | null,
): SocialFeedRealtimeScope | null => {
  if (request?.action !== 'SocialService:fetchFeed') {
    return null;
  }
  const { scope, chains, assetIds, profileId, commentedOnly } = request.options;
  if (
    assetIds !== undefined ||
    profileId !== undefined ||
    commentedOnly === true ||
    !coversEveryFeedChain(chains)
  ) {
    return null;
  }
  return scope === 'all' || scope === 'trending' ? scope : null;
};

/** The asset fields a feed row carries, as the social API names them. */
export interface SocialFeedAssetRef {
  /** Social chain name (`ethereum`, `solana`, `hyperliquid`). */
  chain: string;
  tokenAddress: string;
  /** Raw market id for perps (`BTC`, `xyz:NVDA`); used for Hyperliquid rows. */
  tokenSymbol?: string;
}

const PERP_ASSET_NAMESPACE = 'perp';

const isHyperliquidAsset = (chainName: string): boolean =>
  chainName.trim().toLowerCase() === HYPERLIQUID_CHAIN_NAME;

/**
 * The market id of a Hyperliquid row. Global-feed perp rows can arrive with an
 * empty `tokenAddress`, so the symbol wins.
 */
const perpMarketOf = ({ tokenAddress, tokenSymbol }: SocialFeedAssetRef) =>
  tokenSymbol?.trim() || tokenAddress.trim();

/**
 * The CAIP-19 asset type a feed row is about, as the feed's `assetIds` filter
 * expects it, or `null` when the row's chain or asset has none.
 *
 * - EVM: `eip155:<id>/erc20:<lowercased address>`
 * - Solana: `solana:<ref>/token:<mint>`
 * - Hyperliquid: `eip155:999/perp:<market>`
 *
 * CAIP-19 references cannot hold a colon, so a HIP-3 market such as
 * `xyz:NVDA` becomes `xyz.NVDA`.
 */
export const toFeedAssetId = (
  assetRef: SocialFeedAssetRef,
): CaipAssetType | null => {
  const chain = assetRef.chain.trim().toLowerCase();
  const address = assetRef.tokenAddress.trim();
  let assetId: string;
  if (isHyperliquidAsset(chain)) {
    const market = perpMarketOf(assetRef);
    if (!market) {
      return null;
    }
    assetId = `${HYPERLIQUID_CAIP2_CHAIN_ID}/${PERP_ASSET_NAMESPACE}:${market.replace(/:/gu, '.')}`;
  } else {
    const caip2 = chain && address ? chainNameToId(chain) : undefined;
    if (!caip2) {
      return null;
    }
    const chainNamespace = caip2.split(':')[0];
    const assetNamespace = TOKEN_ASSET_NAMESPACE[chainNamespace];
    if (!assetNamespace) {
      return null;
    }
    assetId = `${caip2}/${assetNamespace}:${normaliseContractAddress(
      chainNamespace,
      address,
    )}`;
  }
  return isCaipAssetType(assetId) ? assetId : null;
};

/**
 * Builds the source for the asset a feed row is about. Hyperliquid rows become
 * perp sources keyed by their market symbol, because global-feed perp rows can
 * arrive with an empty `tokenAddress`.
 */
export const socialFeedSourceFromAsset = (
  assetRef: SocialFeedAssetRef,
): SocialFeedSource | null => {
  if (isHyperliquidAsset(assetRef.chain)) {
    const symbol = perpMarketOf(assetRef);
    return symbol ? { kind: 'perp', symbol } : null;
  }
  const assetId = toFeedAssetId(assetRef);
  return assetId ? { kind: 'token', assetId } : null;
};
