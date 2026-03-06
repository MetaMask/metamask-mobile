import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import ErrorState from '../../components/ErrorState';
import FadingScrollContainer from '../../components/FadingScrollContainer';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import { strings } from '../../../../../../locales/i18n';
import {
  usePredictMarketsForHomepage,
  usePredictPositionsForHomepage,
} from './hooks';
import {
  PredictMarketCard,
  PredictMarketCardSkeleton,
  PredictPositionRow,
  PredictPositionRowSkeleton,
} from './components';
import ViewMoreCard from '../../components/ViewMoreCard';
import type { PredictPosition } from '../../../../UI/Predict/types';
import type { PredictNavigationParamList } from '../../../../UI/Predict/types/navigation';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { PredictClaimButton } from '../../../../UI/Predict/components/PredictActionButtons';
import { usePredictClaim } from '../../../../UI/Predict/hooks/usePredictClaim';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';

const MAX_MARKETS_DISPLAYED = 5;

// Card dimensions for snap offsets
const CARD_WIDTH = 240;
const GAP = 12;
const PADDING = 16; // px-4

// Calculate snap offsets: first card at 0, then padding + card + (gap + card) * n
// ViewMoreCard is excluded — its snap position would exceed max scroll on typical screens,
// causing the scroll view to snap back and never reach it.
const SNAP_OFFSETS = Array.from({ length: MAX_MARKETS_DISPLAYED }, (_, i) =>
  i === 0 ? 0 : PADDING + CARD_WIDTH + (GAP + CARD_WIDTH) * (i - 1),
);

// Skeleton keys for loading state
const SKELETON_KEYS = Array.from(
  { length: MAX_MARKETS_DISPLAYED },
  (__, i) => `skeleton-${i}`,
);

interface PredictionsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * PredictionsSection - Displays prediction content on the homepage
 *
 * Unified section that shows:
 * - User's positions if they have any
 * - Trending markets if they don't have positions
 *
 * Returns null if the Predict feature flag is disabled.
 */
const PredictionsSection = forwardRef<
  SectionRefreshHandle,
  PredictionsSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const title = strings('homepage.sections.predictions');
  const { claim } = usePredictClaim();

  // Fetch both positions and markets
  const {
    positions,
    isLoading: isLoadingPositions,
    error: positionsError,
    refresh: refreshPositions,
  } = usePredictPositionsForHomepage();

  const {
    markets,
    isLoading: isLoadingMarkets,
    error: marketsError,
    refresh: refreshMarkets,
  } = usePredictMarketsForHomepage(MAX_MARKETS_DISPLAYED);

  const {
    positions: claimablePositions,
    isLoading: isLoadingClaimable,
    refresh: refreshClaimable,
  } = usePredictPositionsForHomepage(undefined, true);

  const handleClaim = useCallback(async () => {
    await claim();
    await refreshClaimable();
  }, [claim, refreshClaimable]);

  const totalClaimable = claimablePositions.reduce(
    (sum, p) => sum + (p.currentValue ?? 0),
    0,
  );

  // Determine if user has positions
  const hasPositions = positions.length > 0;

  // Use ref so refresh always reads the latest value without stale closures
  const hasPositionsRef = useRef(hasPositions);
  hasPositionsRef.current = hasPositions;

  const isLoading = isLoadingPositions || isLoadingMarkets;

  const hasError =
    !isLoadingPositions &&
    !isLoadingMarkets &&
    !hasPositions &&
    markets.length === 0 &&
    (positionsError || marketsError);

  const isEmpty =
    !isLoading && !hasPositions && markets.length === 0 && !hasError;

  const itemCount = hasPositions ? positions.length : markets.length;

  // Determine whether the section will actually render visible content.
  // Pass null when the section returns null so the event fires immediately.
  // !isLoading is required: isEmpty is false during loading (its formula starts
  // with !isLoading), so without this guard the hook would fire with stale
  // itemCount/isEmpty values before data arrives.
  const willRender = isPredictEnabled && !isLoading && !isEmpty;

  useHomeViewedEvent({
    sectionRef: willRender ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.PREDICT,
    sectionIndex,
    totalSectionsLoaded,
    // Treat error state as empty — there is no useful content to show.
    isEmpty: isEmpty || !!hasError,
    itemCount,
  });

  // Refresh: only refresh positions if user has them, always refresh markets + claimable
  const refresh = useCallback(async () => {
    if (hasPositionsRef.current) {
      await Promise.all([
        refreshPositions(),
        refreshMarkets(),
        refreshClaimable(),
      ]);
    } else {
      await Promise.all([refreshMarkets(), refreshClaimable()]);
    }
  }, [refreshPositions, refreshMarkets, refreshClaimable]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPredictions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }, [navigation]);

  const handlePositionPress = useCallback(
    (position: PredictPosition) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: position.marketId,
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
          headerShown: false,
        },
      });
    },
    [navigation],
  );

  // Don't render if Predict is disabled
  if (!isPredictEnabled) {
    return null;
  }

  if (hasError) {
    return (
      <View ref={sectionViewRef}>
        <Box gap={3}>
          <SectionHeader title={title} onPress={handleViewAllPredictions} />
          <ErrorState
            title={strings('homepage.error.unable_to_load', {
              section: title.toLowerCase(),
            })}
            onRetry={refresh}
          />
        </Box>
      </View>
    );
  }

  // Render positions if user has any
  if (hasPositions || isLoadingPositions) {
    return (
      <View ref={sectionViewRef}>
        <Box gap={3}>
          <SectionHeader title={title} onPress={handleViewAllPredictions} />
          <Box>
            {isLoadingPositions ? (
              <>
                <PredictPositionRowSkeleton />
                <PredictPositionRowSkeleton />
              </>
            ) : (
              positions.map((position) => (
                <PredictPositionRow
                  key={`${position.outcomeId}:${position.outcomeIndex}`}
                  position={position}
                  onPress={handlePositionPress}
                />
              ))
            )}
            {!isLoadingPositions &&
              !isLoadingClaimable &&
              totalClaimable > 0 && (
                <Box paddingHorizontal={4} paddingTop={1} paddingBottom={3}>
                  <PredictClaimButton
                    amount={totalClaimable}
                    onPress={handleClaim}
                  />
                </Box>
              )}
          </Box>
        </Box>
      </View>
    );
  }

  // Don't render if no markets and not loading (avoids showing ViewMoreCard alone)
  if (!isLoadingMarkets && markets.length === 0) {
    return null;
  }

  // Render trending markets if no positions
  return (
    <View ref={sectionViewRef}>
      <Box gap={3}>
        <SectionHeader title={title} onPress={handleViewAllPredictions} />
        <FadingScrollContainer>
          {(scrollProps) => (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw.style('px-4 gap-3')}
              snapToOffsets={SNAP_OFFSETS}
              decelerationRate="fast"
              {...scrollProps}
            >
              {isLoadingMarkets ? (
                SKELETON_KEYS.map((key) => (
                  <PredictMarketCardSkeleton key={key} />
                ))
              ) : (
                <>
                  {markets.map((market) => (
                    <PredictMarketCard key={market.id} market={market} />
                  ))}
                  <ViewMoreCard
                    onPress={handleViewAllPredictions}
                    twClassName="w-[180px] flex-1"
                  />
                </>
              )}
            </ScrollView>
          )}
        </FadingScrollContainer>
      </Box>
    </View>
  );
});

export default PredictionsSection;
