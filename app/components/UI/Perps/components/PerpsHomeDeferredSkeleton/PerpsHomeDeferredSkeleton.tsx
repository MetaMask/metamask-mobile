import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import { WhatsHappeningCardSkeleton } from '../../../WhatsHappening/components';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';

const WHATS_HAPPENING_SKELETON_CARD_COUNT = 2;

export const PERPS_HOME_DEFERRED_SKELETON_TEST_IDS = {
  WHATS_HAPPENING: 'perps-home-whats-happening-skeleton',
  EXPLORE: 'perps-home-explore-skeleton',
} as const;

/**
 * Title + chevron bar mirroring the design-system SectionHeader used by the
 * real sections.
 */
const SectionHeaderSkeleton: React.FC<{ titleWidth: number }> = ({
  titleWidth,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4 py-2"
  >
    <Skeleton width={titleWidth} height={28} twClassName="rounded" />
    <Skeleton width={24} height={24} twClassName="rounded-full" />
  </Box>
);

/**
 * Mirrors the "What's happening" section: header, "AI generated" subtitle and
 * the first cards of the horizontal carousel.
 */
const WhatsHappeningSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="pb-3 gap-3"
      testID={PERPS_HOME_DEFERRED_SKELETON_TEST_IDS.WHATS_HAPPENING}
    >
      <SectionHeaderSkeleton titleWidth={200} />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 gap-2"
      >
        <Skeleton width={16} height={16} twClassName="rounded-full" />
        <Skeleton width={96} height={14} twClassName="rounded" />
      </Box>
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
      >
        {Array.from(
          { length: WHATS_HAPPENING_SKELETON_CARD_COUNT },
          (_, index) => (
            <WhatsHappeningCardSkeleton key={`wh-skeleton-${index}`} />
          ),
        )}
      </ScrollView>
    </Box>
  );
};

/**
 * Mirrors the Explore section: header, two rows of category pills and the
 * first market rows.
 */
const ExploreSkeleton: React.FC = () => (
  <Box
    twClassName="pb-4"
    testID={PERPS_HOME_DEFERRED_SKELETON_TEST_IDS.EXPLORE}
  >
    <SectionHeaderSkeleton titleWidth={110} />
    <SectionPillsSkeleton rowCount={2} />
    <PerpsRowSkeleton count={HOME_SCREEN_CONFIG.TrendingMarketsLimit} />
  </Box>
);

/**
 * Placeholder shown below the first-paint sections on Perps Home while the
 * remaining sections are held back until the push transition ends. Shapes and
 * sizes mirror the loaded layout so the swap does not shift content.
 */
const PerpsHomeDeferredSkeleton: React.FC = () => (
  <>
    <WhatsHappeningSkeleton />
    <ExploreSkeleton />
  </>
);

export default PerpsHomeDeferredSkeleton;
