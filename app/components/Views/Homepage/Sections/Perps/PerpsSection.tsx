import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextColor,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SectionTitle from '../../components/SectionTitle';
import SectionCard from '../../components/SectionCard';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { usePerpsMarketsReadOnly, usePerpsPositionsReadOnly } from './hooks';
import { PerpsMarketCard } from './components';
import type { MarketInfo } from '../../../../UI/Perps/controllers/types';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

const MAX_PERPS_DISPLAYED = 7;
const TITLE_TRENDING = 'Trending perps';

// Card dimensions for snap offsets
const CARD_WIDTH = 80; // w-20 = 80px
const GAP = 12;
const PADDING = 16; // px-4

// Calculate snap offsets: first card at 0, then padding + card + (gap + card) * n
const SNAP_OFFSETS = Array.from({ length: MAX_PERPS_DISPLAYED }, (_, i) =>
  i === 0 ? 0 : PADDING + CARD_WIDTH + (GAP + CARD_WIDTH) * (i - 1),
);

/**
 * Skeleton placeholder for a perps market card
 */
const PerpsCardSkeleton = () => {
  const tw = useTailwind();
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      padding={3}
      gap={2}
      twClassName="rounded-xl w-20 bg-muted"
    >
      <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
      <Skeleton width={40} height={16} style={tw.style('rounded')} />
      <Skeleton width={32} height={14} style={tw.style('rounded')} />
    </Box>
  );
};

/**
 * PerpsSection - Displays trending perpetual markets on the homepage.
 *
 * Uses lightweight readOnly mode to fetch market data without WebSocket initialization.
 * Shows basic market info (symbol, leverage) in horizontal scrollable cards.
 * Returns null if the Perps feature flag is disabled.
 */
const PerpsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const {
    markets,
    isLoading: isLoadingMarkets,
    error: marketsError,
    refresh: refreshMarkets,
  } = usePerpsMarketsReadOnly(MAX_PERPS_DISPLAYED);

  const { refresh: refreshPositions } = usePerpsPositionsReadOnly();

  // Combined refresh for both markets and positions
  const refresh = useCallback(async () => {
    await Promise.allSettled([refreshMarkets(), refreshPositions()]);
  }, [refreshMarkets, refreshPositions]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);

  const handleMarketPress = useCallback(
    (_market: MarketInfo) => {
      // Navigate to perps home - the full environment will load there
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    },
    [navigation],
  );

  // Don't render if Perps is disabled
  if (!isPerpsEnabled) {
    return null;
  }

  // Show error state for markets
  if (marketsError && !isLoadingMarkets && markets.length === 0) {
    return (
      <Box gap={3}>
        <SectionTitle title={TITLE_TRENDING} onPress={handleViewAllPerps} />
        <SectionRow>
          <SectionCard>
            <Text color={TextColor.TextAlternative}>
              Unable to load perps markets
            </Text>
          </SectionCard>
        </SectionRow>
      </Box>
    );
  }

  return (
    <Box gap={3}>
      <SectionTitle title={TITLE_TRENDING} onPress={handleViewAllPerps} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
        snapToOffsets={SNAP_OFFSETS}
        decelerationRate="fast"
      >
        {isLoadingMarkets ? (
          <>
            <PerpsCardSkeleton />
            <PerpsCardSkeleton />
            <PerpsCardSkeleton />
            <PerpsCardSkeleton />
            <PerpsCardSkeleton />
            <PerpsCardSkeleton />
            <PerpsCardSkeleton />
          </>
        ) : (
          markets.map((market) => (
            <PerpsMarketCard
              key={market.name}
              market={market}
              onPress={handleMarketPress}
            />
          ))
        )}
      </ScrollView>
    </Box>
  );
});

export default PerpsSection;
