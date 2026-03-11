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
import SectionTitle from '../../components/SectionTitle';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
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
    refetch: refetchPositions,
  } = usePredictPositionsForHomepage();

  const {
    markets,
    isLoading: isLoadingMarkets,
    error: marketsError,
    refetch: refetchMarkets,
  } = usePredictMarketsForHomepage(MAX_MARKETS_DISPLAYED);

  const { totalClaimableValue, isLoading: isLoadingClaimable } =
    usePredictPositionsForHomepage({ claimable: true });

  const handleClaim = useCallback(async () => {
    await claim();
  }, [claim]);

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

  const refresh = useCallback(async () => {
    await Promise.all([refetchPositions(), refetchMarkets()]);
  }, [refetchPositions, refetchMarkets]);

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
          <SectionTitle
            title={title}
            onPress={handleViewAllPredictions}
            testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(
              'predictions',
            )}
          />
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
          <SectionTitle
            title={title}
            onPress={handleViewAllPredictions}
            testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(
              'predictions',
            )}
          />
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
              totalClaimableValue > 0 && (
                <Box paddingHorizontal={4} paddingTop={1} paddingBottom={3}>
                  <PredictClaimButton
                    amount={totalClaimableValue}
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
        <SectionTitle
          title={title}
          onPress={handleViewAllPredictions}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-3')}
        >
          {isLoadingMarkets ? (
            SKELETON_KEYS.map((key) => <PredictMarketCardSkeleton key={key} />)
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
      </Box>
    </View>
  );
});

export default PredictionsSection;
