import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../../util/theme';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import FadingScrollView from '../../components/FadingScrollView';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import {
  usePerpsMarketsStandalone,
  usePerpsPositionsStandalone,
} from './hooks';
import {
  PerpsMarketCard,
  PerpsPositionRow,
  PerpsPositionRowSkeleton,
} from './components';
import type { MarketInfo } from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import { strings } from '../../../../../../locales/i18n';

const MAX_PERPS_DISPLAYED = 7;
const MAX_POSITIONS_DISPLAYED = 5;

// Card dimensions for snap offsets
const CARD_WIDTH = 80; // w-20 = 80px
const GAP = 12;
const PADDING = 16; // px-4

// Calculate snap offsets for market cards carousel
const SNAP_OFFSETS = Array.from({ length: MAX_PERPS_DISPLAYED }, (_, i) =>
  i === 0 ? 0 : PADDING + CARD_WIDTH + (GAP + CARD_WIDTH) * (i - 1),
);

/**
 * Skeleton placeholder for a perps market card
 */
const PerpsCardSkeleton = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      padding={3}
      gap={2}
      twClassName="rounded-xl w-20"
    >
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('items-center gap-2')}>
          <View style={tw.style('w-10 h-10 rounded-full')} />
          <View style={tw.style('w-10 h-4 rounded')} />
          <View style={tw.style('w-8 h-3.5 rounded')} />
        </View>
      </SkeletonPlaceholder>
    </Box>
  );
};

const SKELETON_KEYS = Array.from(
  { length: MAX_PERPS_DISPLAYED },
  (_, i) => `skeleton-${i}`,
);

/**
 * PerpsSection - Displays perpetual trading content on the homepage.
 *
 * Conditional rendering:
 * - Shows user's open positions when they have any
 * - Shows trending market cards carousel when no positions
 *
 * Returns null if the Perps feature flag is disabled.
 */
const PerpsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const title = strings('homepage.sections.perpetuals');

  // Fetch both positions and markets
  const {
    positions,
    isLoading: isLoadingPositions,
    error: positionsError,
    refresh: refreshPositions,
  } = usePerpsPositionsStandalone();

  const {
    markets,
    isLoading: isLoadingMarkets,
    error: marketsError,
    refresh: refreshMarkets,
  } = usePerpsMarketsStandalone(MAX_PERPS_DISPLAYED);

  // Determine if user has positions
  const hasPositions = positions.length > 0;

  // Use ref to keep refresh callback stable
  const hasPositionsRef = useRef(hasPositions);
  hasPositionsRef.current = hasPositions;

  // Refresh: only refresh positions if user has them, always refresh markets
  const refresh = useCallback(async () => {
    if (hasPositionsRef.current) {
      await Promise.all([refreshPositions(), refreshMarkets()]);
    } else {
      await refreshMarkets();
    }
  }, [refreshPositions, refreshMarkets]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);

  const handleMarketPress = useCallback(
    (_market: MarketInfo) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    },
    [navigation],
  );

  const handlePositionPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);

  // Don't render if Perps is disabled
  if (!isPerpsEnabled) {
    return null;
  }

  // Show error state when both fail and nothing is loading
  const hasError =
    !isLoadingPositions &&
    !isLoadingMarkets &&
    !hasPositions &&
    markets.length === 0 &&
    (positionsError || marketsError);

  if (hasError) {
    return (
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewAllPerps} />
        <ErrorState
          title={strings('homepage.error.unable_to_load', {
            section: title.toLowerCase(),
          })}
          onRetry={refresh}
        />
      </Box>
    );
  }

  // Don't render if no markets, no positions, and not loading
  if (
    !isLoadingMarkets &&
    !isLoadingPositions &&
    !hasPositions &&
    markets.length === 0
  ) {
    return null;
  }

  // Render positions if user has any
  if (hasPositions || isLoadingPositions) {
    return (
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewAllPerps} />
        <SectionRow>
          {isLoadingPositions ? (
            <PerpsPositionRowSkeleton />
          ) : (
            <View testID="homepage-perps-positions">
              {positions.slice(0, MAX_POSITIONS_DISPLAYED).map((position) => (
                <PerpsPositionRow
                  key={`pos-${position.symbol}-${position.size}`}
                  position={position}
                  onPress={handlePositionPress}
                />
              ))}
            </View>
          )}
        </SectionRow>
      </Box>
    );
  }

  // Render trending markets carousel if no positions
  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPerps} />
      <FadingScrollView
        contentContainerStyle={tw.style('px-4 gap-3')}
        snapToOffsets={SNAP_OFFSETS}
        decelerationRate="fast"
      >
        {isLoadingMarkets
          ? SKELETON_KEYS.map((key) => <PerpsCardSkeleton key={key} />)
          : markets.map((market) => (
              <PerpsMarketCard
                key={market.name}
                market={market}
                onPress={handleMarketPress}
              />
            ))}
      </FadingScrollView>
    </Box>
  );
});

export default PerpsSection;
