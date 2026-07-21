import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  FilterButton,
  SectionHeader,
  SegmentedControl,
} from '@metamask/design-system-react-native';
import {
  type PerpsMarketData,
  type SortDirection,
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
} from '@metamask/perps-controller';
import { PillScrollList } from '../../../Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import { PerpsPillItem } from '../PerpsPillItem';
import {
  isPerpsTopMoversSectionVisible,
  usePerpsTopMovers,
} from '../../hooks/usePerpsTopMovers';
import { usePerpsNavigation } from '../../hooks';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { selectPerpsTopMoversEnabledFlag } from '../../selectors/featureFlags';
import { strings } from '../../../../../../locales/i18n';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const TOP_MOVERS_ROW_COUNT = 2;
const TOP_MOVERS_MAX_PILLS = 8;

type PerpsTopMoversSource =
  (typeof PERPS_EVENT_VALUE.SOURCE)[keyof typeof PERPS_EVENT_VALUE.SOURCE];

export interface PerpsTopMoversSectionProps {
  /** Source attributed to navigation and market-details events triggered from this section. */
  source: PerpsTopMoversSource;
  /** Bound onto market-list and market-details route params for downstream transaction A/B attribution. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PerpsTopMoversSectionInner: React.FC<PerpsTopMoversSectionProps> = ({
  source,
  transactionActiveAbTests,
}) => {
  const perpsNavigation = usePerpsNavigation();
  const { track } = usePerpsEventTracking();
  const [direction, setDirection] = useState<SortDirection>('desc');
  const { data, isLoading } = usePerpsTopMovers({ direction });

  // Pills navigate to asset_details — use source=perps_home + direction-aware
  // source_section so analysts can distinguish gainers from losers.
  const pillSourceSection =
    direction === 'desc'
      ? PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_GAINERS
      : PERPS_EVENT_VALUE.SOURCE_SECTION.TOP_LOSERS;

  const handleViewAll = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.TOP_MOVERS,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
    perpsNavigation.navigateToMarketList({
      defaultSortOptionId: 'priceChange',
      defaultSortDirection: direction,
      source,
      ...(transactionActiveAbTests?.length ? { transactionActiveAbTests } : {}),
    });
  }, [track, perpsNavigation, direction, source, transactionActiveAbTests]);

  const renderPill = (item: PerpsMarketData) => {
    const feedItem: PerpsFeedItem = { market: item, isWatchlisted: false };
    return (
      <PerpsPillItem
        item={feedItem}
        marketDetailsSource={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
        marketDetailsSourceSection={pillSourceSection}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    );
  };

  if (!isPerpsTopMoversSectionVisible({ isLoading, data })) {
    return null;
  }

  return (
    <Box
      paddingBottom={3}
      testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_SECTION}
    >
      <SectionHeader
        title={strings('perps.home.top_movers')}
        isInteractive
        onPress={handleViewAll}
        testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER}
      />
      <Box twClassName="px-4 mb-3">
        <SegmentedControl
          value={direction === 'desc' ? 'gainers' : 'losers'}
          onChange={(value) =>
            setDirection(value === 'gainers' ? 'desc' : 'asc')
          }
          isFullWidth
        >
          <FilterButton
            value="gainers"
            testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_GAINERS_PILL}
          >
            {strings('perps.home.gainers')}
          </FilterButton>
          <FilterButton
            value="losers"
            testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL}
          >
            {strings('perps.home.losers')}
          </FilterButton>
        </SegmentedControl>
      </Box>
      <PillScrollList<PerpsMarketData>
        data={data}
        isLoading={isLoading}
        renderItem={renderPill}
        keyExtractor={(item) => item.symbol}
        Skeleton={SectionPillsSkeleton}
        rowCount={TOP_MOVERS_ROW_COUNT}
        maxPills={TOP_MOVERS_MAX_PILLS}
        wrapperTwClassName="bg-transparent"
        listTestId={PerpsHomeViewSelectorsIDs.TOP_MOVERS_LIST}
      />
    </Box>
  );
};

const PerpsTopMoversSection: React.FC<PerpsTopMoversSectionProps> = (props) => {
  const isEnabled = useSelector(selectPerpsTopMoversEnabledFlag);
  if (!isEnabled) {
    return null;
  }
  return <PerpsTopMoversSectionInner {...props} />;
};

export default PerpsTopMoversSection;
