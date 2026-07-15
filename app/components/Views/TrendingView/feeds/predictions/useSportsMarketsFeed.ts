import { useCallback, useMemo, useState } from 'react';
import {
  usePredictMarketData,
  type UsePredictMarketDataResult,
} from '../../../../UI/Predict/hooks/usePredictMarketData';
import { strings } from '../../../../../../locales/i18n';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import type { PillOption } from '../../components/PillRow';

const PAGE_SIZE = 20;

// Tag IDs from gamma-api.polymarket.com/tags. To add a sport:
// add a row here AND a usePredictMarketData call below (Rules of Hooks).
const SOCCER = {
  key: 'soccer',
  labelKey: 'trending.football',
  customQueryParams: 'tag_id=100350',
} as const;
const BASKETBALL = {
  key: 'basketball',
  labelKey: 'trending.basketball',
  customQueryParams: 'tag_id=28',
} as const;
const TENNIS = {
  key: 'tennis',
  labelKey: 'trending.tennis',
  customQueryParams: 'tag_id=864',
} as const;

const TABS = [SOCCER, BASKETBALL, TENNIS] as const;

export interface UseSportsMarketsFeedResult {
  pills: PillOption[];
  activeKey: string;
  select: (key: string) => void;
  active: UsePredictMarketDataResult;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

interface UseSportsMarketsFeedOptions {
  refresh?: RefreshConfig;
}

/**
 * Per-sport markets feed for the "All Sports" section. Owns pill state and
 * lazily enables fetches for sports the user has visited.
 */
export const useSportsMarketsFeed = ({
  refresh,
}: UseSportsMarketsFeedOptions = {}): UseSportsMarketsFeedResult => {
  const [activeKey, setActiveKey] = useState<string>(SOCCER.key);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(
    () => new Set([SOCCER.key]),
  );

  const soccer = usePredictMarketData({
    category: 'sports',
    customQueryParams: SOCCER.customQueryParams,
    pageSize: PAGE_SIZE,
    enabled: loadedKeys.has(SOCCER.key),
  });
  const basketball = usePredictMarketData({
    category: 'sports',
    customQueryParams: BASKETBALL.customQueryParams,
    pageSize: PAGE_SIZE,
    enabled: loadedKeys.has(BASKETBALL.key),
  });
  const tennis = usePredictMarketData({
    category: 'sports',
    customQueryParams: TENNIS.customQueryParams,
    pageSize: PAGE_SIZE,
    enabled: loadedKeys.has(TENNIS.key),
  });

  const marketsByKey: Record<string, UsePredictMarketDataResult> = useMemo(
    () => ({ soccer, basketball, tennis }),
    [soccer, basketball, tennis],
  );

  const pills = useMemo<PillOption[]>(
    () => TABS.map((tab) => ({ key: tab.key, name: strings(tab.labelKey) })),
    [],
  );

  const select = useCallback((key: string) => {
    setActiveKey(key);
    setLoadedKeys((prev) => new Set(prev).add(key));
  }, []);

  const { refetch: refetchSoccer } = soccer;
  const { refetch: refetchBasketball } = basketball;
  const { refetch: refetchTennis } = tennis;

  const refetch = useCallback(async () => {
    const tasks: Promise<void>[] = [];
    if (loadedKeys.has(SOCCER.key)) tasks.push(refetchSoccer());
    if (loadedKeys.has(BASKETBALL.key)) tasks.push(refetchBasketball());
    if (loadedKeys.has(TENNIS.key)) tasks.push(refetchTennis());
    await Promise.all(tasks);
  }, [loadedKeys, refetchSoccer, refetchBasketball, refetchTennis]);

  useFeedRefresh(refresh, refetch);

  const active = marketsByKey[activeKey];
  const isLoading = active.isFetching && active.marketData.length === 0;

  return { pills, activeKey, select, active, isLoading, refetch };
};
