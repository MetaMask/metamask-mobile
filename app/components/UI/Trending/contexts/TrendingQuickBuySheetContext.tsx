import type { TrendingAsset } from '@metamask/assets-controllers';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { QuickBuySheetSource } from '../../QuickBuy/analytics';
import TrendingQuickBuy from '../components/TrendingQuickBuy/TrendingQuickBuy';

interface TrendingQuickBuySheetContextValue {
  openQuickBuy: (token: TrendingAsset, source?: QuickBuySheetSource) => void;
  closeQuickBuy: () => void;
  isQuickBuyOpen: boolean;
}

const TrendingQuickBuySheetContext = createContext<
  TrendingQuickBuySheetContextValue | undefined
>(undefined);

/**
 * Hosts Explore-tab Quick Buy above the Home tab navigator so the sheet is
 * not clipped by an individual tab's content area / bottom tab bar.
 *
 * Stack entry points (trending full view, search, token details) keep their
 * local `TrendingQuickBuy` mounts — they already sit above HomeTabs.
 */
export const TrendingQuickBuySheetProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [token, setToken] = useState<TrendingAsset | null>(null);
  const [source, setSource] = useState<QuickBuySheetSource>('explore_search');

  const openQuickBuy = useCallback(
    (
      nextToken: TrendingAsset,
      nextSource: QuickBuySheetSource = 'explore_search',
    ) => {
      setSource(nextSource);
      setToken(nextToken);
    },
    [],
  );

  const closeQuickBuy = useCallback(() => {
    setToken(null);
  }, []);

  const value = useMemo(
    (): TrendingQuickBuySheetContextValue => ({
      openQuickBuy,
      closeQuickBuy,
      isQuickBuyOpen: token !== null,
    }),
    [openQuickBuy, closeQuickBuy, token],
  );

  return (
    <TrendingQuickBuySheetContext.Provider value={value}>
      {children}
      <TrendingQuickBuy token={token} onClose={closeQuickBuy} source={source} />
    </TrendingQuickBuySheetContext.Provider>
  );
};

/**
 * Opens Explore-tab Quick Buy via the root sheet host mounted above Tab.Navigator.
 */
export function useTrendingQuickBuySheet(): TrendingQuickBuySheetContextValue {
  const ctx = useContext(TrendingQuickBuySheetContext);
  if (!ctx) {
    throw new Error(
      'useTrendingQuickBuySheet must be used within TrendingQuickBuySheetProvider',
    );
  }
  return ctx;
}
