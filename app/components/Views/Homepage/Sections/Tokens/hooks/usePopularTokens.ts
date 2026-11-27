import { useCallback, useMemo } from 'react';
import {
  create,
  number,
  optional,
  record,
  string,
  type,
} from '@metamask/superstruct';
import { useSelector } from 'react-redux';
import { onlineManager } from '@tanstack/react-query';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { useNetworkQuery } from '../../../../../../core/Networking/useNetworkQuery';
import {
  MUSD_TOKEN_ADDRESS,
  isMusdToken,
} from '../../../../../UI/Earn/constants/musd';
import { selectMoneyHubEnabledFlag } from '../../../../../UI/Money/selectors/featureFlags';

/**
 * Popular token metadata with CAIP-19 asset IDs
 * Format: namespace:chainId/assetNamespace:assetReference
 */
/**
 * Builds a token icon URL from the MetaMask static asset CDN.
 * Format: https://static.cx.metamask.io/api/v2/tokenIcons/assets/{namespace}/{chainId}/{assetNamespace}/{assetReference}.png
 */
const buildIconUrl = (
  namespace: string,
  chainId: string,
  assetNamespace: string,
  assetReference: string,
): string =>
  `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${namespace}/${chainId}/${assetNamespace}/${assetReference}.png`;

const POPULAR_TOKENS = [
  {
    // mUSD on Ethereum Mainnet
    assetId: `eip155:1/erc20:${MUSD_TOKEN_ADDRESS}`,
    name: 'MetaMask USD',
    symbol: 'mUSD',
    // Description will be added dynamically with localized string
    iconUrl: buildIconUrl('eip155', '1', 'erc20', MUSD_TOKEN_ADDRESS),
  },
  {
    // ETH on Ethereum Mainnet (native)
    assetId: 'eip155:1/slip44:60',
    name: 'Ethereum',
    symbol: 'ETH',
    iconUrl: buildIconUrl('eip155', '1', 'slip44', '60'),
  },
  {
    // BTC on Bitcoin Mainnet
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    name: 'Bitcoin',
    symbol: 'BTC',
    iconUrl: buildIconUrl(
      'bip122',
      '000000000019d6689c085ae165831e93',
      'slip44',
      '0',
    ),
  },
  {
    // SOL on Solana Mainnet
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    name: 'Solana',
    symbol: 'SOL',
    iconUrl: buildIconUrl(
      'solana',
      '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'slip44',
      '501',
    ),
  },
  {
    // BNB on BNB Smart Chain
    assetId: 'eip155:56/slip44:714',
    name: 'BNB',
    symbol: 'BNB',
    iconUrl: buildIconUrl('eip155', '56', 'slip44', '714'),
  },
] as const;

export interface PopularToken {
  assetId: string;
  name: string;
  symbol: string;
  iconUrl: string;
  price: number | undefined;
  priceChange1d: number | undefined;
}

const PRICE_REFRESH_INTERVAL_MS = 60_000;
const ASSET_IDS = POPULAR_TOKENS.map(({ assetId }) => assetId).join(',');
const SpotPricesSchema = record(
  string(),
  type({
    price: optional(number()),
    pricePercentChange1d: optional(number()),
  }),
);

/**
 * Hook to fetch popular tokens with their current prices for zero balance accounts.
 * Uses the MetaMask Price API to get real-time price data.
 *
 * Returns two loading states:
 * - isInitialLoading: true when fetching for the first time (no data yet)
 * - isRefreshing: true when refetching via interval or manual refresh
 */
export const usePopularTokens = () => {
  const vsCurrency = useSelector(selectCurrentCurrency).toLowerCase();
  const shouldExcludeMusd = useSelector(selectMoneyHubEnabledFlag);
  const params = new URLSearchParams({
    assetIds: ASSET_IDS,
    includeMarketData: 'true',
    vsCurrency,
  });
  const { data, error, isLoading, isRefetching, refetch } = useNetworkQuery({
    queryKey: ['homepage', 'popular-token-prices', ASSET_IDS, vsCurrency],
    url: `https://price.api.cx.metamask.io/v3/spot-prices?${params}`,
    parse: (body) => create(body, SpotPricesSchema),
    staleTime: PRICE_REFRESH_INTERVAL_MS,
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
  });

  const fetchPrices = useCallback(async (): Promise<void> => {
    // A paused query can outlive the Home pull-to-refresh spinner.
    if (!onlineManager.isOnline()) return;
    await refetch({ cancelRefetch: false });
  }, [refetch]);

  const tokens: PopularToken[] = useMemo(() => {
    if (isLoading) return [];

    return POPULAR_TOKENS.filter((token) => {
      const address = token.assetId.split(':').pop();
      return !shouldExcludeMusd || !isMusdToken(address);
    }).map((token) => ({
      ...token,
      price: data?.[token.assetId]?.price,
      priceChange1d: data?.[token.assetId]?.pricePercentChange1d,
    }));
  }, [data, isLoading, shouldExcludeMusd]);

  return useMemo(
    () => ({
      tokens,
      isInitialLoading: isLoading,
      isRefreshing: isRefetching,
      error,
      refetch: fetchPrices,
    }),
    [tokens, isLoading, isRefetching, error, fetchPrices],
  );
};
