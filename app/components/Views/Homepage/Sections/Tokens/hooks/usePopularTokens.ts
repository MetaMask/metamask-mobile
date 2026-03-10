import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { handleFetch } from '@metamask/controller-utils';
import { strings } from '../../../../../../../locales/i18n';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN_ADDRESS,
} from '../../../../../UI/Earn/constants/musd';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../../UI/Earn/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../../../UI/Earn/hooks/useMusdConversionEligibility';

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
    hasMusdBonus: true,
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
  description?: string;
  price: number | undefined;
  priceChange1d: number | undefined;
}

interface PriceApiResponse {
  [assetId: string]: {
    price?: number;
    pricePercentChange1d?: number;
  };
}

/**
 * Adds dynamic description for tokens that have special bonuses
 */
const getTokenDescription = (
  token: (typeof POPULAR_TOKENS)[number],
): string | undefined => {
  if ('hasMusdBonus' in token && token.hasMusdBonus) {
    return strings('earn.musd_conversion.get_a_percentage_musd_bonus', {
      percentage: MUSD_CONVERSION_APY,
    });
  }
  return undefined;
};

/**
 * Hook to fetch popular tokens with their current prices for zero balance accounts.
 * Uses the MetaMask Price API to get real-time price data.
 *
 * Returns two loading states:
 * - isInitialLoading: true when fetching for the first time (no data yet)
 * - isRefreshing: true when refetching via interval or manual refresh
 */
export const usePopularTokens = () => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();
  const isCashSectionEnabled = isMusdConversionFlowEnabled && isGeoEligible;
  const [rawTokens, setRawTokens] = useState<
    {
      assetId: string;
      name: string;
      symbol: string;
      iconUrl: string;
      price: number | undefined;
      priceChange1d: number | undefined;
      hasMusdBonus?: boolean;
    }[]
  >([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to track if we've fetched once (avoids dependency in callback)
  const hasFetchedOnceRef = useRef(false);

  // Fetch generation counter to prevent stale responses from overwriting fresh data.
  // Each fetch captures a snapshot of the counter; if a newer fetch starts before the
  // older one resolves, the older fetch's state updates are silently discarded.
  const fetchIdRef = useRef(0);

  const fetchPrices = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;

    // Determine if this is initial load or refresh
    if (hasFetchedOnceRef.current) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }
    setError(null);

    try {
      const assetIds = POPULAR_TOKENS.map((t) => t.assetId).join(',');
      const url = `https://price.api.cx.metamask.io/v3/spot-prices?${new URLSearchParams(
        {
          assetIds,
          includeMarketData: 'true',
          vsCurrency: currentCurrency.toLowerCase(),
        },
      )}`;

      const response = (await handleFetch(url)) as PriceApiResponse;

      // Discard result if a newer fetch has been initiated
      if (fetchId !== fetchIdRef.current) return;

      setRawTokens(
        POPULAR_TOKENS.map((token) => ({
          ...token,
          price: response[token.assetId]?.price,
          priceChange1d: response[token.assetId]?.pricePercentChange1d,
        })),
      );
    } catch (err) {
      // Discard error if a newer fetch has been initiated
      if (fetchId !== fetchIdRef.current) return;

      setError(
        err instanceof Error ? err : new Error('Failed to fetch prices'),
      );
      // Still set tokens without prices so UI can render
      setRawTokens(
        POPULAR_TOKENS.map((token) => ({
          ...token,
          price: undefined,
          priceChange1d: undefined,
        })),
      );
    } finally {
      // Only update loading states if this is still the latest fetch
      if (fetchId === fetchIdRef.current) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
        hasFetchedOnceRef.current = true;
      }
    }
  }, [currentCurrency]);

  // Fetch prices on mount and when currency changes
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // On unmount, invalidate any in-flight fetch so it won't call setState
  useEffect(
    () => () => {
      fetchIdRef.current++;
    },
    [],
  );

  // Add descriptions dynamically (localized strings must be called within component).
  // When Cash section is enabled, exclude mUSD from this list (it is shown in Cash section).
  const tokens: PopularToken[] = useMemo(() => {
    const mapped = rawTokens.map((token) => {
      const baseToken = POPULAR_TOKENS.find((t) => t.assetId === token.assetId);
      return {
        assetId: token.assetId,
        name: token.name,
        symbol: token.symbol,
        iconUrl: token.iconUrl,
        price: token.price,
        priceChange1d: token.priceChange1d,
        description: baseToken ? getTokenDescription(baseToken) : undefined,
      };
    });
    return isCashSectionEnabled
      ? mapped.filter((t) => t.symbol !== 'mUSD')
      : mapped;
  }, [rawTokens, isCashSectionEnabled]);

  return {
    tokens,
    isInitialLoading,
    isRefreshing,
    error,
    refetch: fetchPrices,
  };
};
