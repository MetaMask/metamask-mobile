import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import SectionRow from '../../components/SectionRow';
import PerpsPositionSkeleton from './components/PerpsPositionSkeleton';
import PerpsTrendingCarousel from './components/PerpsTrendingCarousel';
import { useHomepageSparklines } from './hooks/useHomepageSparklines';
import { usePerpsTrendingCarouselData } from './hooks/usePerpsTrendingCarouselData';
import { strings } from '../../../../../../locales/i18n';
import type { SectionRefreshHandle } from '../../types';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { usePerpsNavigationHandlers } from './hooks/usePerpsNavigationHandlers';

const PerpsSectionTrendingOnly = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      sectionName: sectionNameOverride,
      titleOverride,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const title = titleOverride ?? strings('homepage.sections.perpetuals');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PERPS;
    const { handleViewAllPerps, handleViewMorePerps, handleTilePress } =
      usePerpsNavigationHandlers();
    const { marketsLoading, allCarouselMarkets, watchlistSymbolSet } =
      usePerpsTrendingCarouselData({});
    const carouselSymbols = useMemo(
      () => allCarouselMarkets.map((m) => m.symbol),
      [allCarouselMarkets],
    );
    const { sparklines, refresh: refreshSparklines } =
      useHomepageSparklines(carouselSymbols);

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          refreshSparklines();
        },
      }),
      [refreshSparklines],
    );

    const itemCount = allCarouselMarkets.length;
    const { onLayout } = useHomeViewedEvent({
      sectionRef: !marketsLoading && itemCount > 0 ? sectionViewRef : null,
      isLoading: marketsLoading,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: itemCount === 0,
      itemCount,
    });

    if (!marketsLoading && itemCount === 0) {
      return null;
    }

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box paddingBottom={3}>
          <SectionDivider />
          <SectionHeader
            title={title}
            isInteractive
            onPress={handleViewAllPerps}
            testID={homepageSectionTitleTestId(analyticsName)}
          />
          <Box paddingTop={3}>
            {marketsLoading ? (
              <SectionRow>
                <PerpsPositionSkeleton />
              </SectionRow>
            ) : (
              <PerpsTrendingCarousel
                markets={allCarouselMarkets}
                watchlistSymbolSet={watchlistSymbolSet}
                sparklines={sparklines}
                onPressMarket={handleTilePress}
                onPressViewMore={handleViewMorePerps}
              />
            )}
          </Box>
        </Box>
      </View>
    );
  },
);

PerpsSectionTrendingOnly.displayName = 'PerpsSectionTrendingOnly';

export default PerpsSectionTrendingOnly;
