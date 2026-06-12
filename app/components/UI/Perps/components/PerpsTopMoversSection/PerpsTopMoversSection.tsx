import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  type PerpsMarketData,
  type SortDirection,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import { PillScrollList } from '../../../Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import { PerpsPillItem } from '../PerpsPillItem';
import { usePerpsTopMovers } from '../../hooks/usePerpsTopMovers';
import { usePerpsNavigation } from '../../hooks';
import { selectPerpsTopMoversEnabledFlag } from '../../selectors/featureFlags';
import { strings } from '../../../../../../locales/i18n';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const TOP_MOVERS_ROW_COUNT = 2;
const TOP_MOVERS_MAX_PILLS = 8;

interface TogglePillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  testID: string;
}

const TogglePill: React.FC<TogglePillProps> = ({
  label,
  isSelected,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={tw.style(
        'flex-1 rounded-lg items-center justify-center py-1',
        isSelected ? 'bg-icon-default' : 'bg-muted',
      )}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isSelected ? TextColor.InfoInverse : TextColor.TextDefault}
      >
        {label}
      </Text>
    </Pressable>
  );
};

type PerpsTopMoversSource =
  (typeof PERPS_EVENT_VALUE.SOURCE)[keyof typeof PERPS_EVENT_VALUE.SOURCE];

export interface PerpsTopMoversSectionProps {
  /** Source attributed to navigation and market-details events triggered from this section. */
  source: PerpsTopMoversSource;
  /** Bound onto market-list and market-details route params for downstream transaction A/B attribution. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

/**
 * Inner component — only mounted when the feature flag is enabled.
 * Keeps all stream-based hooks (usePerpsTopMovers, usePerpsMarkets,
 * usePerpsLivePrices) out of the React tree entirely when the flag is off,
 * so no subscriptions or sorting work runs unnecessarily.
 */
const PerpsTopMoversSectionInner: React.FC<PerpsTopMoversSectionProps> = ({
  source,
  transactionActiveAbTests,
}) => {
  const tw = useTailwind();
  const perpsNavigation = usePerpsNavigation();
  const [direction, setDirection] = useState<SortDirection>('desc');
  const { data, isLoading } = usePerpsTopMovers({ direction });

  if (!isLoading && data.length === 0) {
    return null;
  }

  const handleViewAll = () => {
    perpsNavigation.navigateToMarketList({
      defaultSortOptionId: 'priceChange',
      defaultSortDirection: direction,
      source,
      ...(transactionActiveAbTests?.length ? { transactionActiveAbTests } : {}),
    });
  };

  const renderPill = (item: PerpsMarketData) => {
    const feedItem: PerpsFeedItem = { market: item, isWatchlisted: false };
    return (
      <PerpsPillItem
        item={feedItem}
        marketDetailsSource={source}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    );
  };

  return (
    <Box
      paddingTop={8}
      style={tw.style('mb-6 border-t border-muted')}
      testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_SECTION}
    >
      <SectionHeader
        title={strings('perps.home.top_movers')}
        onPress={handleViewAll}
        testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER}
        twClassName="mb-3"
      />

      {/* Gainers / Losers toggle */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 gap-2 mb-2"
      >
        <TogglePill
          label={strings('perps.home.gainers')}
          isSelected={direction === 'desc'}
          onPress={() => setDirection('desc')}
          testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_GAINERS_PILL}
        />
        <TogglePill
          label={strings('perps.home.losers')}
          isSelected={direction === 'asc'}
          onPress={() => setDirection('asc')}
          testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_LOSERS_PILL}
        />
      </Box>

      <PillScrollList<PerpsMarketData>
        data={data}
        isLoading={isLoading}
        renderItem={renderPill}
        keyExtractor={(item) => item.symbol}
        Skeleton={SectionPillsSkeleton}
        rowCount={TOP_MOVERS_ROW_COUNT}
        maxPills={TOP_MOVERS_MAX_PILLS}
        wrapperTwClassName="bg-transparent mt-1"
        listTestId={PerpsHomeViewSelectorsIDs.TOP_MOVERS_LIST}
      />
    </Box>
  );
};

/**
 * "Top Movers" section for the Perps home screen.
 *
 * Reads the feature flag first. When the flag is off the inner component is
 * never mounted, so no stream subscriptions or sorting work runs at all.
 * When enabled, renders a Gainers / Losers toggle and a 2×4 pill carousel of
 * the top price-change markets with live WebSocket price updates.
 */
const PerpsTopMoversSection: React.FC<PerpsTopMoversSectionProps> = (props) => {
  const isEnabled = useSelector(selectPerpsTopMoversEnabledFlag);
  if (!isEnabled) {
    return null;
  }
  return <PerpsTopMoversSectionInner {...props} />;
};

export default PerpsTopMoversSection;
