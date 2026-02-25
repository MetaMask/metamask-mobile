import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  View,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import SectionTitle from '../../components/SectionTitle';
import ErrorState from '../../components/ErrorState';
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
  ViewMoreCard,
} from './components';
import { colorWithOpacity } from '../../../../../util/colors';
import type { PredictPosition } from '../../../../UI/Predict/types';
import type { PredictNavigationParamList } from '../../../../UI/Predict/types/navigation';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import useHomepageSectionViewedEvent, {
  HomepageSectionNames,
} from '../../hooks/useHomepageSectionViewedEvent';

const MAX_MARKETS_DISPLAYED = 5;

// Card dimensions for snap offsets
const CARD_WIDTH = 280;
const GAP = 12;
const PADDING = 16; // px-4

// Calculate snap offsets: first card at 0, then padding + card + (gap + card) * n
// +1 for the ViewMoreCard at the end
const SNAP_OFFSETS = Array.from(
  { length: MAX_MARKETS_DISPLAYED + 1 },
  (_, i) => (i === 0 ? 0 : PADDING + CARD_WIDTH + (GAP + CARD_WIDTH) * (i - 1)),
);

// Skeleton keys for loading state
const SKELETON_KEYS = Array.from(
  { length: MAX_MARKETS_DISPLAYED },
  (__, i) => `skeleton-${i}`,
);

// Fade overlay width
const FADE_WIDTH = 40;

const styles = StyleSheet.create({
  scrollContainer: {
    position: 'relative',
  },
  fadeOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
    pointerEvents: 'none',
  },
});

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
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const title = strings('homepage.sections.predictions');

  // Track scroll position for fade effect
  const [fadeOpacity, setFadeOpacity] = useState(1);

  const sectionViewRef = useRef<View>(null);

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

  // Determine if user has positions
  const hasPositions = positions.length > 0;

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

  useHomepageSectionViewedEvent({
    sectionRef: willRender ? sectionViewRef : null,
    isLoading,
    sectionName: HomepageSectionNames.PREDICT,
    sectionIndex,
    totalSectionsLoaded,
    // Treat error state as empty — there is no useful content to show.
    isEmpty: isEmpty || !!hasError,
    itemCount,
  });

  // Use ref so refresh always reads the latest value without stale closures
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

  const handleViewAllPredictions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }, [navigation]);

  // Handle scroll to update fade opacity
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const scrollableWidth = contentSize.width - layoutMeasurement.width;

      // No scrollable content — hide fade
      if (scrollableWidth <= 0) {
        setFadeOpacity(0);
        return;
      }

      const distanceFromEnd = scrollableWidth - contentOffset.x;

      // Fade out the overlay as we approach the end (within 100px)
      const fadeThreshold = 100;
      const newOpacity = Math.min(
        1,
        Math.max(0, distanceFromEnd / fadeThreshold),
      );
      setFadeOpacity(newOpacity);
    },
    [],
  );

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
          <SectionTitle title={title} onPress={handleViewAllPredictions} />
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
        <SectionTitle title={title} onPress={handleViewAllPredictions} />
        <View style={styles.scrollContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('px-4 gap-3')}
            snapToOffsets={SNAP_OFFSETS}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
                <ViewMoreCard onPress={handleViewAllPredictions} />
              </>
            )}
          </ScrollView>
          {/* Fade overlay on the right edge */}
          {fadeOpacity > 0 && (
            <LinearGradient
              colors={[
                colorWithOpacity(colors.background.default, 0),
                colors.background.default,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fadeOverlay, { opacity: fadeOpacity }]}
            />
          )}
        </View>
      </Box>
    </View>
  );
});

export default PredictionsSection;
