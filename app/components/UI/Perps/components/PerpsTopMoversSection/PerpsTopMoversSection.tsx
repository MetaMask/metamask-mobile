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
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  type PerpsMarketData,
  type SortDirection,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
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

const PerpsTopMoversSectionInner: React.FC<PerpsTopMoversSectionProps> = ({
  source,
  transactionActiveAbTests,
}) => {
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
      paddingBottom={3}
      testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_SECTION}
    >
      <SectionDivider />
      <SectionHeader
        title={strings('perps.home.top_movers')}
        isInteractive
        onPress={handleViewAll}
        testID={PerpsHomeViewSelectorsIDs.TOP_MOVERS_HEADER}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 gap-2"
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
