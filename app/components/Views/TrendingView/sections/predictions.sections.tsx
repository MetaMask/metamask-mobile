import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  IconName as DSIconName,
} from '@metamask/design-system-react-native';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import {
  usePredictMarketData,
  type UsePredictMarketDataResult,
} from '../../../UI/Predict/hooks/usePredictMarketData';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import PredictMarketRowItem from '../../../UI/Predict/components/PredictMarketRowItem';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';
import SiteSkeleton from '../../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import SectionCarrousel from '../components/Sections/SectionTypes/SectionCarrousel';
import AllSportsPillSection from '../components/Sections/SectionTypes/AllSportsPillSection';
import type { PillOption } from '../components/Sections/SectionTypes/PillRow';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { fuseSearch, PREDICTIONS_FUSE_OPTIONS } from './search-utils';
import type { SectionConfig, SectionId } from './types';

type PredictCategory = 'trending' | 'sports' | 'crypto' | 'politics';

const ALL_SPORTS_PAGE_SIZE = 20;

// To add a sport: add a row here AND a usePredictMarketData call in the hook below (Rules of Hooks).
// Tag IDs: https://gamma-api.polymarket.com/tags
const SOCCER = {
  key: 'soccer',
  labelKey: 'trending.soccer',
  customQueryParams: `tag_id=100350`,
} as const;
const BASKETBALL = {
  key: 'basketball',
  labelKey: 'trending.basketball',
  customQueryParams: `tag_id=28`,
} as const;
const TENNIS = {
  key: 'tennis',
  labelKey: 'trending.tennis',
  customQueryParams: `tag_id=864`,
} as const;

const ALL_SPORTS_TABS = [SOCCER, BASKETBALL, TENNIS] as const;

/** Passed via `data[0]` from `useAllSportsExploreSectionData` to `AllSportsPillSection`. */
export interface ExploreKeyedMarketsSectionPayload {
  pills: PillOption[];
  marketsByKey: Record<string, UsePredictMarketDataResult>;
  activeKey: string;
  selectSport: (key: string) => void;
}

export const useAllSportsExploreSectionData = (): {
  data: unknown[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} => {
  const [activeKey, setActiveKey] = useState<string>(SOCCER.key);
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(
    () => new Set([SOCCER.key]),
  );

  const soccer = usePredictMarketData({
    category: 'sports',
    customQueryParams: SOCCER.customQueryParams,
    pageSize: ALL_SPORTS_PAGE_SIZE,
    enabled: loadedKeys.has(SOCCER.key),
  });
  const basketball = usePredictMarketData({
    category: 'sports',
    customQueryParams: BASKETBALL.customQueryParams,
    pageSize: ALL_SPORTS_PAGE_SIZE,
    enabled: loadedKeys.has(BASKETBALL.key),
  });
  const tennis = usePredictMarketData({
    category: 'sports',
    customQueryParams: TENNIS.customQueryParams,
    pageSize: ALL_SPORTS_PAGE_SIZE,
    enabled: loadedKeys.has(TENNIS.key),
  });

  const pills = useMemo<PillOption[]>(
    () =>
      ALL_SPORTS_TABS.map((tab) => ({
        key: tab.key,
        name: strings(tab.labelKey),
      })),
    [],
  );

  const selectSport = useCallback((key: string) => {
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

  return {
    data: [
      {
        pills,
        marketsByKey: { soccer, basketball, tennis },
        activeKey,
        selectSport,
      } satisfies ExploreKeyedMarketsSectionPayload,
    ],
    isLoading: false,
    refetch,
  };
};

const makePredictionsSection = ({
  id,
  titleKey,
  category,
  testIdPrefix,
  tab,
}: {
  id: SectionId;
  titleKey: string;
  category: PredictCategory;
  testIdPrefix: string;
  tab?: string;
}): SectionConfig => ({
  id,
  title: strings(titleKey),
  icon: { source: 'design-system', name: DSIconName.Speedometer },
  viewAllAction: (navigation) => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: tab ? { tab } : undefined,
    });
  },
  getItemIdentifier: (item) => (item as Partial<PredictMarketType>).id ?? '',
  RowItem: ({ item }) => (
    <Box twClassName="py-2">
      <PredictMarket
        market={item as PredictMarketType}
        isCarousel
        testID={`${testIdPrefix}-${(item as PredictMarketType).id}`}
      />
    </Box>
  ),
  OverrideRowItemSearch: ({ item }) => (
    <PredictMarketRowItem market={item as PredictMarketType} />
  ),
  Skeleton: () => <PredictMarketSkeleton isCarousel />,
  // PredictMarketSkeleton has too much spacing in search context
  OverrideSkeletonSearch: SiteSkeleton,
  Section: SectionCarrousel,
  useSectionData: (searchQuery) => {
    const { marketData, isFetching, refetch } = usePredictMarketData({
      category,
      pageSize: searchQuery ? 20 : 6,
      q: searchQuery || undefined,
    });
    const filteredData = useMemo(
      () => fuseSearch(marketData, searchQuery, PREDICTIONS_FUSE_OPTIONS),
      [marketData, searchQuery],
    );
    return { data: filteredData, isLoading: isFetching, refetch };
  },
});

export const predictionsSections = {
  predictions: makePredictionsSection({
    id: 'predictions',
    titleKey: 'wallet.predict',
    category: 'trending',
    testIdPrefix: 'predict-market-row-item',
  }),
  sports_predictions: makePredictionsSection({
    id: 'sports_predictions',
    titleKey: 'trending.predictions',
    category: 'sports',
    testIdPrefix: 'predict-sports-market-row-item',
    tab: 'sports',
  }),
  crypto_predictions: makePredictionsSection({
    id: 'crypto_predictions',
    titleKey: 'trending.predictions',
    category: 'crypto',
    testIdPrefix: 'predict-crypto-market-row-item',
    tab: 'crypto',
  }),
  politics_predictions: makePredictionsSection({
    id: 'politics_predictions',
    titleKey: 'trending.predictions',
    category: 'politics',
    testIdPrefix: 'predict-rwa-politics-market-row-item',
    tab: 'politics',
  }),

  all_sports: {
    id: 'all_sports',
    title: strings('trending.all_sports'),
    icon: { source: 'design-system', name: DSIconName.Speedometer },
    showViewAllInHeader: false,
    omitEmptyStateCheck: true,
    viewAllAction: () => {
      /* no view-all for this section */
    },
    getItemIdentifier: (item) => (item as Partial<PredictMarketType>).id ?? '',
    RowItem: ({ item }) => (
      <Box twClassName="py-2">
        <PredictMarket market={item as PredictMarketType} isCarousel />
      </Box>
    ),
    OverrideRowItemSearch: ({ item }) => (
      <PredictMarketRowItem market={item as PredictMarketType} />
    ),
    Skeleton: () => <PredictMarketSkeleton isCarousel />,
    OverrideSkeletonSearch: SiteSkeleton,
    Section: AllSportsPillSection,
    useSectionData: useAllSportsExploreSectionData,
  } satisfies SectionConfig,
};
