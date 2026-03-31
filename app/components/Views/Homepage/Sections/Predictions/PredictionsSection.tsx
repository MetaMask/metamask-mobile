import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import Routes from '../../../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { SectionRefreshHandle } from '../../types';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
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
import type {
  PredictPosition,
  UnrealizedPnL,
} from '../../../../UI/Predict/types';
import type { PredictNavigationParamList } from '../../../../UI/Predict/types/navigation';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { PredictClaimButton } from '../../../../UI/Predict/components/PredictActionButtons';
import { usePredictClaim } from '../../../../UI/Predict/hooks/usePredictClaim';
import { useUnrealizedPnL } from '../../../../UI/Predict/hooks/useUnrealizedPnL';
import { predictQueries } from '../../../../UI/Predict/queries';
import { getEvmAccountFromSelectedAccountGroup } from '../../../../UI/Predict/utils/accounts';
import { formatPredictUnrealizedPnLStringParts } from '../../../../UI/Predict/utils/format';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import HomepageSectionUnrealizedPnlRow, {
  type HomepageUnrealizedPnlTone,
} from '../../components/HomepageSectionUnrealizedPnlRow';

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

interface PredictHomepageUnrealizedPnlRowState {
  show: boolean;
  isLoading: boolean;
  valueText?: string;
  tone: HomepageUnrealizedPnlTone;
}

function getPredictHomepageUnrealizedPnlRowState(input: {
  hasPositions: boolean;
  privacyMode: boolean;
  isPnlLoading: boolean;
  pnl: UnrealizedPnL | null | undefined;
}): PredictHomepageUnrealizedPnlRowState {
  const { hasPositions, privacyMode, isPnlLoading, pnl } = input;

  if (!hasPositions || privacyMode) {
    return { show: false, isLoading: false, tone: 'neutral' };
  }
  if (isPnlLoading) {
    return { show: true, isLoading: true, tone: 'neutral' };
  }
  if (!pnl) {
    return { show: false, isLoading: false, tone: 'neutral' };
  }

  const cashUpnl = pnl.cashUpnl ?? 0;
  const valueText = strings(
    'predict.unrealized_pnl_value',
    formatPredictUnrealizedPnLStringParts({
      cashUpnl,
      percentUpnl: pnl.percentUpnl ?? 0,
    }),
  );

  return {
    show: true,
    isLoading: false,
    valueText,
    tone: cashUpnl > 0 ? 'positive' : cashUpnl < 0 ? 'negative' : 'neutral',
  };
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
  const privacyMode = useSelector(selectPrivacyMode);
  const queryClient = useQueryClient();
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

  const {
    data: predictUnrealizedPnL,
    isLoading: isPredictUnrealizedPnLLoading,
  } = useUnrealizedPnL({
    enabled: hasPositions,
  });

  const predictHomepageUnrealizedPnl = useMemo(
    () =>
      getPredictHomepageUnrealizedPnlRowState({
        hasPositions,
        privacyMode,
        isPnlLoading: isPredictUnrealizedPnLLoading,
        pnl: predictUnrealizedPnL,
      }),
    [
      hasPositions,
      privacyMode,
      isPredictUnrealizedPnLLoading,
      predictUnrealizedPnL,
    ],
  );

  const isLoading = isLoadingPositions || isLoadingMarkets;

  const hasError =
    !isLoadingPositions &&
    !isLoadingMarkets &&
    !hasPositions &&
    markets.length === 0 &&
    (positionsError || marketsError);

  const isEmpty =
    !isLoading && !hasPositions && markets.length === 0 && !hasError;

  const itemCount = hasPositions ? positions.length : 0;

  // Determine whether the section will actually render visible content.
  // Pass null when the section returns null so the event fires immediately.
  // !isLoading is required: isEmpty is false during loading (its formula starts
  // with !isLoading), so without this guard the hook would fire with stale
  // itemCount/isEmpty values before data arrives.
  const willRender = isPredictEnabled && !isLoading && !isEmpty && !hasError;

  const { onLayout } = useHomeViewedEvent({
    sectionRef: willRender ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.PREDICT,
    sectionIndex,
    totalSectionsLoaded,
    // Empty when user has no positions (showing discovery/promotional content or nothing).
    // Treat error state as empty — there is no useful content to show.
    isEmpty: !hasPositions || !!hasError,
    itemCount,
  });

  const refresh = useCallback(async () => {
    const addr = getEvmAccountFromSelectedAccountGroup()?.address;
    const invalidatePnl = addr
      ? queryClient.invalidateQueries({
          queryKey: predictQueries.unrealizedPnL.keys.byAddress(addr),
        })
      : Promise.resolve();
    await Promise.all([refetchPositions(), refetchMarkets(), invalidatePnl]);
  }, [queryClient, refetchPositions, refetchMarkets]);

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

  // Don't render if there is a connection error
  if (hasError) {
    return null;
  }

  // Render positions if user has any
  if (hasPositions || isLoadingPositions) {
    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3}>
          <Box gap={1}>
            <SectionHeader
              title={title}
              onPress={handleViewAllPredictions}
              testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(
                'predictions',
              )}
            />
            {predictHomepageUnrealizedPnl.show && (
              <HomepageSectionUnrealizedPnlRow
                isLoading={predictHomepageUnrealizedPnl.isLoading}
                valueText={predictHomepageUnrealizedPnl.valueText}
                tone={predictHomepageUnrealizedPnl.tone}
                label={strings('predict.unrealized_pnl_label')}
                testID="homepage-predict-unrealized-pnl"
              />
            )}
          </Box>
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
                  privacyMode={Boolean(privacyMode)}
                />
              ))
            )}
            {!isLoadingPositions &&
              !isLoadingClaimable &&
              totalClaimableValue > 0 && (
                <Box paddingHorizontal={4} paddingTop={1} paddingBottom={3}>
                  <PredictClaimButton
                    amount={privacyMode ? undefined : totalClaimableValue}
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
    <View ref={sectionViewRef} onLayout={onLayout}>
      <Box gap={3}>
        <SectionHeader
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
