import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, TextVariant } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
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

/**
 * PredictionsSection - Displays prediction content on the homepage
 *
 * Unified section that shows:
 * - User's positions if they have any
 * - Trending markets if they don't have positions
 *
 * Returns null if the Predict feature flag is disabled.
 */
const PredictionsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
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

  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      await claim();
      await refreshClaimable();
    } finally {
      setIsClaiming(false);
    }
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

  // Show error state when both hooks fail and nothing is loading
  const hasError =
    !isLoadingPositions &&
    !isLoadingMarkets &&
    !hasPositions &&
    markets.length === 0 &&
    (positionsError || marketsError);

  if (hasError) {
    return (
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewAllPredictions} />
        <ErrorState
          title={strings('homepage.error.unable_to_load', {
            section: title.toLowerCase(),
          })}
          onRetry={refresh}
        />
      </Box>
    );
  }

  // Render positions if user has active positions, or claimable winnings
  if (
    hasPositions ||
    isLoadingPositions ||
    (!isLoadingClaimable && totalClaimable > 0)
  ) {
    return (
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewAllPredictions} />
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
            !isClaiming &&
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
    );
  }

  // Don't render if no markets and not loading (avoids showing ViewMoreCard alone)
  if (!isLoadingMarkets && markets.length === 0) {
    return null;
  }

  // Render trending markets if no positions
  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPredictions} />
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
                  twClassName="w-[180px] h-[180px]"
                  textVariant={TextVariant.BodyLg}
                />
              </>
            )}
          </ScrollView>
        )}
      </FadingScrollContainer>
    </Box>
  );
});

export default PredictionsSection;
