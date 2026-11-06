import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { PredictMarket as PredictMarketType } from '../types';
import HorizontalCarousel from '../../../Views/TrendingView/components/HorizontalCarousel';
import SectionHeader from '../../../Views/TrendingView/components/SectionHeader';
import PredictionsSkeleton from './PredictionsSkeleton';
import { PredictionCarouselRowItem } from './PredictionRowItem';
import {
  trackExploreInteracted,
  type ExploreTabName,
  type ExploreSectionName,
} from '../../../Views/TrendingView/search/analytics';

interface PredictionsCarouselSectionProps {
  feed: { data: PredictMarketType[]; isLoading: boolean };
  tabName: ExploreTabName;
  sectionName: ExploreSectionName;
  title: string;
  testIdPrefix: string;
  idPrefix: string;
  onViewAll: () => void;
  /** When false the section is hidden entirely (feature-flag guard). Defaults to true. */
  isEnabled?: boolean;
  /** Extra Tailwind classes for the title row (e.g. top padding overrides). */
  titleTwClassName?: string;
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
  },
});

/**
 * Reusable predictions horizontal carousel with section header and analytics.
 * Returns null when disabled or when the feed is empty and not loading.
 */
const PredictionsCarouselSection: React.FC<PredictionsCarouselSectionProps> = ({
  feed,
  tabName,
  sectionName,
  title,
  testIdPrefix,
  idPrefix,
  onViewAll,
  isEnabled = true,
  titleTwClassName = 'pt-2',
}) => {
  const renderItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item, index }) => (
      <PredictionCarouselRowItem
        market={item}
        testIdPrefix={testIdPrefix}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: tabName,
            section_name: sectionName,
            asset_type: 'prediction',
            position: index,
            item_clicked: item.id,
          })
        }
        onBuyButtonPress={({ market }) =>
          trackExploreInteracted({
            interaction_type: 'prediction_voted',
            tab_name: tabName,
            section_name: sectionName,
            item_clicked: market.id,
          })
        }
      />
    ),
    [tabName, sectionName, testIdPrefix],
  );

  if (!isEnabled || (!feed.isLoading && feed.data.length === 0)) return null;

  return (
    <Box>
      <SectionHeader
        title={title}
        onViewAll={onViewAll}
        testID={`section-header-view-all-${idPrefix}`}
        tabName={tabName}
        sectionName={sectionName}
        titleTwClassName={titleTwClassName}
        style={styles.header}
      />
      <HorizontalCarousel<PredictMarketType>
        data={feed.data.slice(0, 6)}
        isLoading={feed.isLoading}
        renderItem={renderItem}
        Skeleton={PredictionsSkeleton}
        idPrefix={idPrefix}
      />
    </Box>
  );
};

export default PredictionsCarouselSection;
