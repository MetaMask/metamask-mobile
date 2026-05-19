import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import { strings } from '../../../../../../locales/i18n';
import type { SectionRefreshHandle } from '../../types';
import { usePerpsEventTracking } from '../../../../UI/Perps/hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
import PillScrollList from '../../../TrendingView/components/PillScrollList';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
import PerpsPillItem from '../../../TrendingView/feeds/perps/PerpsPillItem';
import {
  usePerpsFeed,
  type PerpsFeedItem,
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
} from '../../../TrendingView/feeds/perps/usePerpsFeed';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
import CryptoMoversSkeleton from '../../../TrendingView/feeds/tokens/CryptoMoversSkeleton';
import Routes from '../../../../../constants/navigation/Routes';
import { usePerpsNavigationHandlers } from './hooks/usePerpsNavigationHandlers';

/**
 * Homepage-only "Perps movers" section: same title and pill rail as Explore Now tab,
 * with homepage SectionHeader + Perps market-list navigation on "see all", and
 * PERPS_UI_INTERACTION (WALLET_HOME) on pill taps for wallet attribution.
 */
const HomepagePerpsMoversSection = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>(
  (
    { sectionIndex, totalSectionsLoaded, sectionName: sectionNameOverride },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const { track } = usePerpsEventTracking();
    const { navigateToTutorialOrScreen } = usePerpsNavigationHandlers();
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PERPS;
    const title = strings('trending.perps_movers');

    const perps = usePerpsFeed({
      variant: 'all',
      withTileExtras: false,
    });

    const handleViewAll = useCallback(() => {
      navigateToTutorialOrScreen(Routes.PERPS.MARKET_LIST, {
        defaultMarketTypeFilter: 'all',
        defaultSortOptionId: perps.defaultSortOptionId,
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      });
    }, [navigateToTutorialOrScreen, perps.defaultSortOptionId]);

    const handlePillNavigation = useCallback(
      (market: PerpsFeedItem['market']) => {
        navigateToTutorialOrScreen(Routes.PERPS.MARKET_DETAILS, {
          market,
          source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
        });
      },
      [navigateToTutorialOrScreen],
    );

    const refetchPills = perps.refetch;

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          await refetchPills();
        },
      }),
      [refetchPills],
    );

    const isLoadingSection = perps.isLoading;
    const isEmpty = !perps.isLoading && perps.data.length === 0;
    const itemCount = perps.data.length;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: !isEmpty ? sectionViewRef : null,
      isLoading: isLoadingSection,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty,
      itemCount,
    });

    useSectionPerformance({
      sectionId: analyticsName,
      contentReady: !isLoadingSection,
      isEmpty,
      isLoading: isLoadingSection,
    });

    const trackPillWalletHome = useCallback(() => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.OPEN_POSITION,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.WALLET_HOME,
      });
    }, [track]);

    if (!perps.isLoading && perps.data.length === 0) {
      return null;
    }

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3} twClassName="px-4">
          <SectionHeader
            title={title}
            onPress={handleViewAll}
            twClassName="px-0"
          />
          <PillScrollList<PerpsFeedItem>
            data={perps.data}
            isLoading={perps.isLoading}
            wrapperTwClassName="-mx-4 bg-transparent"
            renderItem={(item) => (
              <PerpsPillItem
                item={item}
                onCardPress={trackPillWalletHome}
                onNavigateToMarketDetails={handlePillNavigation}
              />
            )}
            keyExtractor={(pillItem) => pillItem.market.symbol}
            Skeleton={CryptoMoversSkeleton}
            listTestId="homepage-perps-pills-list"
          />
        </Box>
      </View>
    );
  },
);

HomepagePerpsMoversSection.displayName = 'HomepagePerpsMoversSection';

export default HomepagePerpsMoversSection;
