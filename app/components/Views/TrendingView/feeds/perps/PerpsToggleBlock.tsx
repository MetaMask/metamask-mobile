import React, { useCallback, useRef } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { PerpsMarketData, SortOptionId } from '@metamask/perps-controller';
import PerpsRowItem from './PerpsRowItem';
import PerpsRowSkeleton from '../../../../UI/Perps/components/PerpsRowSkeleton';
import PillToggleCardList, {
  type PillToggleCardListTab,
} from '../../components/PillToggleCardList';
import SectionHeader from '../../components/SectionHeader';
import {
  type ExploreTabName,
  type ExploreSectionName,
  trackExploreInteracted,
} from '../../search/analytics';

const PerpsRowSingleSkeleton: React.FC = () => <PerpsRowSkeleton count={1} />;

export interface PerpsToggleBlockProps {
  title: string;
  tabs: PillToggleCardListTab<PerpsMarketData>[];
  isLoading: boolean;
  defaultPillKey: string;
  onViewAll: (filter: string, sortOptionId: SortOptionId) => void;
  sortOptionId: SortOptionId;
  /** Analytics context */
  tabName: ExploreTabName;
  sectionName: ExploreSectionName;
  /** Test IDs */
  headerTestID: string;
  idPrefix: string;
  testIdPrefix: string;
  listTestId: string;
}

/**
 * Shared perps section that renders a pill-toggled list of perp rows with
 * a "See all" header. Used by MacroTab and RwasTab.
 */
const PerpsToggleBlock: React.FC<PerpsToggleBlockProps> = ({
  title,
  tabs,
  isLoading,
  defaultPillKey,
  onViewAll,
  sortOptionId,
  tabName,
  sectionName,
  headerTestID,
  idPrefix,
  testIdPrefix,
  listTestId,
}) => {
  const activePillKey = useRef<string>(defaultPillKey);

  const renderItem: ListRenderItem<PerpsMarketData> = useCallback(
    ({ item, index }) => (
      <PerpsRowItem
        market={item}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: tabName,
            section_name: sectionName,
            asset_type: 'perp',
            position: index,
            item_clicked: item.symbol,
          })
        }
      />
    ),
    [tabName, sectionName],
  );

  return (
    <Box>
      <SectionHeader
        title={title}
        onViewAll={() => onViewAll(activePillKey.current, sortOptionId)}
        testID={headerTestID}
        tabName={tabName}
        sectionName={sectionName}
      />
      <PillToggleCardList<PerpsMarketData>
        tabs={tabs}
        isLoading={isLoading}
        renderItem={renderItem}
        Skeleton={PerpsRowSingleSkeleton}
        idPrefix={idPrefix}
        onPillChange={(key) => {
          activePillKey.current = key;
        }}
        testIdPrefix={testIdPrefix}
        listTestId={listTestId}
      />
    </Box>
  );
};

export default PerpsToggleBlock;
