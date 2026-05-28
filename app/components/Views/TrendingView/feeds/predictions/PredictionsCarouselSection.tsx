import React, { useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';
import HorizontalCarousel from '../../components/HorizontalCarousel';
import SectionHeader from '../../components/SectionHeader';
import PredictionsSkeleton from './PredictionsSkeleton';
import { PredictionCarouselRowItem } from './PredictionRowItem';
import {
  trackExploreInteracted,
  type ExploreTabName,
  type ExploreSectionName,
} from '../../search/analytics';

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
}

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
        onBuyButtonPress={(marketId) =>
          trackExploreInteracted({
            interaction_type: 'prediction_voted',
            tab_name: tabName,
            section_name: sectionName,
            item_clicked: marketId,
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
      />
      <HorizontalCarousel<PredictMarketType>
        data={feed.data}
        isLoading={feed.isLoading}
        renderItem={renderItem}
        Skeleton={PredictionsSkeleton}
        idPrefix={idPrefix}
      />
    </Box>
  );
};

export default PredictionsCarouselSection;
