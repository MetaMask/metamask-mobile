import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectWhatsHappeningEnabled } from '../../../../../../selectors/featureFlagController/whatsHappening';
import type { WhatsHappeningItem } from '../types';

/**
 * Result interface for useWhatsHappening hook
 */
export interface UseWhatsHappeningResult {
  items: WhatsHappeningItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface CacheEntry {
  items: WhatsHappeningItem[];
  timestamp: number;
  limit: number;
}

let whatsHappeningCache: CacheEntry | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * @internal Exported for testing only.
 */
export const _clearWhatsHappeningCache = (): void => {
  whatsHappeningCache = null;
};

const DUMMY_ITEMS: WhatsHappeningItem[] = [
  {
    id: '1',
    title: 'ETH surges past $4,000',
    description:
      'Ethereum breaks above $4,000 for the first time in months, driven by strong institutional demand.',
    imageUrl: undefined,
    date: new Date().toISOString(),
    relatedAssets: ['ETH'],
  },
  {
    id: '2',
    title: 'Bitcoin hits new all-time high',
    description:
      'Bitcoin surpasses $100K as spot ETF inflows continue to accelerate.',
    imageUrl: undefined,
    date: new Date(Date.now() - 3_600_000).toISOString(),
    relatedAssets: ['BTC'],
  },
  {
    id: '3',
    title: 'Solana DeFi TVL doubles',
    description:
      'Total value locked on Solana doubles in 30 days amid growing ecosystem activity.',
    imageUrl: undefined,
    date: new Date(Date.now() - 7_200_000).toISOString(),
    relatedAssets: ['SOL'],
  },
  {
    id: '4',
    title: 'Layer 2 adoption accelerates',
    description:
      'Arbitrum and Optimism see record transaction counts as users migrate to L2s.',
    imageUrl: undefined,
    date: new Date(Date.now() - 10_800_000).toISOString(),
    relatedAssets: ['ARB', 'OP'],
  },
  {
    id: '5',
    title: 'Stablecoin market cap reaches $200B',
    description:
      'The combined stablecoin market cap hits a new record, signaling strong demand for on-chain dollars.',
    imageUrl: undefined,
    date: new Date(Date.now() - 14_400_000).toISOString(),
    relatedAssets: ['USDC', 'USDT'],
  },
];

/**
 * Hook to fetch trending "What's Happening" items for the homepage carousel.
 *
 * Currently returns dummy data. Will be wired to an API endpoint in a
 * future iteration, following the same controller pattern as MarketInsights.
 *
 * @param limit - Maximum number of items to return (default: 5)
 * @returns Object with items, isLoading, error, refresh
 */
export const useWhatsHappening = (limit = 5): UseWhatsHappeningResult => {
  const isEnabled = useSelector(selectWhatsHappeningEnabled);

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const limitRef = useRef(limit);
  limitRef.current = limit;

  const [state, setState] = useState<{
    items: WhatsHappeningItem[];
    isLoading: boolean;
    error: string | null;
  }>(() => {
    if (
      whatsHappeningCache &&
      Date.now() - whatsHappeningCache.timestamp < CACHE_TTL_MS &&
      whatsHappeningCache.limit >= limit
    ) {
      return {
        items: whatsHappeningCache.items.slice(0, limit),
        isLoading: false,
        error: null,
      };
    }

    return {
      items: [],
      isLoading: !!isEnabled,
      error: null,
    };
  });

  const fetchItems = useCallback(async () => {
    const currentLimit = limitRef.current;

    if (!isEnabled) {
      setState({ items: [], isLoading: false, error: null });
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    if (
      whatsHappeningCache &&
      Date.now() - whatsHappeningCache.timestamp < CACHE_TTL_MS &&
      whatsHappeningCache.limit >= currentLimit
    ) {
      if (isMountedRef.current) {
        setState({
          items: whatsHappeningCache.items.slice(0, currentLimit),
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // TODO: Replace with real API call via Engine.context controller
      // e.g. await Engine.context.WhatsHappeningController.getTrending({ limit })
      const items = DUMMY_ITEMS.slice(0, currentLimit);

      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      whatsHappeningCache = {
        items,
        timestamp: Date.now(),
        limit: currentLimit,
      };

      setState({ items, isLoading: false, error: null });
    } catch (err) {
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      setState({
        items: [],
        isLoading: false,
        error:
          err instanceof Error ? err.message : 'Failed to fetch trending items',
      });
    }
  }, [isEnabled]);

  const refresh = useCallback(async () => {
    whatsHappeningCache = null;
    await fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isEnabled) {
      setState({ items: [], isLoading: false, error: null });
      return () => {
        isMountedRef.current = false;
      };
    }

    fetchItems();

    return () => {
      isMountedRef.current = false;
    };
  }, [isEnabled, fetchItems]);

  return {
    items: state.items,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
};

export default useWhatsHappening;
