import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import {
  type MarketTypeFilter,
  type PerpsMarketData,
  type SortOptionId,
} from '@metamask/perps-controller';
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

/** Valid perps category filter keys — all `MarketTypeFilter` values except `'all'`. */
export type PerpsFilterKey = Exclude<MarketTypeFilter, 'all'>;

const PerpsRowSingleSkeleton: React.FC = () => <PerpsRowSkeleton count={1} />;

export interface PerpsToggleBlockProps {
  title: string;
  tabs: PillToggleCardListTab<PerpsMarketData>[];
  isLoading: boolean;
  defaultPillKey: PerpsFilterKey;
  onViewAll: (filter: PerpsFilterKey, sortOptionId: SortOptionId) => void;
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
  const visibleTabs = useMemo(
    () => (isLoading ? tabs : tabs.filter((t) => t.items.length > 0)),
    [isLoading, tabs],
  );

  const firstVisibleKey = (visibleTabs[0]?.key ??
    defaultPillKey) as PerpsFilterKey;
  const [activePillKey, setActivePillKey] =
    useState<PerpsFilterKey>(firstVisibleKey);

  useEffect(() => {
    setActivePillKey((current) =>
      visibleTabs.some((tab) => tab.key === current)
        ? current
        : firstVisibleKey,
    );
  }, [firstVisibleKey, visibleTabs]);

  const handlePillChange = useCallback((key: string) => {
    setActivePillKey(key as PerpsFilterKey);
  }, []);

  const renderItem: ListRenderItem<PerpsMarketData> = useCallback(
    ({ item, index }) => (
      <PerpsRowItem
        market={item}
        sourceSection={sectionName}
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
        onViewAll={() => onViewAll(activePillKey, sortOptionId)}
        testID={headerTestID}
        tabName={tabName}
        sectionName={sectionName}
      />
      <PillToggleCardList<PerpsMarketData>
        key={visibleTabs.map((tab) => tab.key).join(',')}
        tabs={visibleTabs}
        isLoading={isLoading}
        renderItem={renderItem}
        Skeleton={PerpsRowSingleSkeleton}
        idPrefix={idPrefix}
        defaultPillKey={firstVisibleKey}
        onPillChange={handlePillChange}
        testIdPrefix={testIdPrefix}
        listTestId={listTestId}
      />
    </Box>
  );
};

export default PerpsToggleBlock;
