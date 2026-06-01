import React, { useState } from 'react';
import { Pressable } from 'react-native';
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
import { strings } from '../../../../../../locales/i18n';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';

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
        'flex-1 rounded-xl items-center',
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

export interface PerpsTopMoversSectionProps {
  /** Called when the "Top movers >" header is tapped — should navigate to Market List.
   * Receives the currently active sort direction so the caller can pre-sort accordingly. */
  onViewAll: (direction: SortDirection) => void;
}

/**
 * "Top Movers" section for the Perps home screen.
 *
 * Renders a Gainers / Losers toggle and a 2×4 pill carousel of the top
 * price-change markets. Data is fetched from the controller with no
 * client-side sort or slice applied.
 *
 * Hides itself entirely when not loading and no market data is available.
 */
const PerpsTopMoversSection: React.FC<PerpsTopMoversSectionProps> = ({
  onViewAll,
}) => {
  const tw = useTailwind();
  const [direction, setDirection] = useState<SortDirection>('desc');
  const { data, isLoading } = usePerpsTopMovers({ direction });

  if (!isLoading && data.length === 0) {
    return null;
  }

  const renderPill = (item: PerpsMarketData) => {
    const feedItem: PerpsFeedItem = { market: item, isWatchlisted: false };
    return (
      <PerpsPillItem
        item={feedItem}
        marketDetailsSource={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
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
        onPress={() => onViewAll(direction)}
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

export default PerpsTopMoversSection;
