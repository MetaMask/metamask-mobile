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
import { SectionRefreshHandle, HomeSectionMode } from '../../types';
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
  PredictMarket,
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
  type HomeSectionName,
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

type PredictionsTrendingHeaderTestId = 'trending-predictions' | 'predictions';

interface HomepagePredictTrendingMarketsProps {
  title: string;
  onViewAll: () => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  isLoadingMarkets: boolean;
  markets: PredictMarket[];
}

/**
 * Shared header + horizontal markets carousel for homepage predictions
 * (default “trending when empty” and dedicated trending-only section).
 */
const HomepagePredictTrendingMarkets = ({
  title,
  onViewAll,
  headerTestIdKey,
  isLoadingMarkets,
  markets,
}: HomepagePredictTrendingMarketsProps) => {
  const tw = useTailwind();
  return (
    <Box gap={3}>
      <SectionHeader
        title={title}
        onPress={onViewAll}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(headerTestIdKey)}
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
            <ViewMoreCard onPress={onViewAll} twClassName="w-[180px] flex-1" />
          </>
        )}
      </ScrollView>
    </Box>
  );
};

interface PredictionsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /** @default 'default' */
  mode?: HomeSectionMode;
  /** Override the section name used in analytics events. */
  sectionName?: HomeSectionName;
  /** Override the section header title. */
  titleOverride?: string;
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

interface HomepagePredictPositionsProps {
  title: string;
  onViewAll: () => void;
  privacyMode: boolean;
  isLoadingPositions: boolean;
  positions: PredictPosition[];
  isLoadingClaimable: boolean;
  totalClaimableValue: number;
  predictHomepageUnrealizedPnl: PredictHomepageUnrealizedPnlRowState;
  onClaim: () => Promise<void>;
  onPositionPress: (position: PredictPosition) => void;
}

const HomepagePredictPositions = ({
  title,
  onViewAll,
  privacyMode,
  isLoadingPositions,
  positions,
  isLoadingClaimable,
  totalClaimableValue,
  predictHomepageUnrealizedPnl,
  onClaim,
  onPositionPress,
}: HomepagePredictPositionsProps) => (
  <Box gap={3}>
    <Box gap={1}>
      <SectionHeader
        title={title}
        onPress={onViewAll}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions')}
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
            onPress={onPositionPress}
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
              onPress={onClaim}
            />
          </Box>
        )}
    </Box>
  </Box>
);

const usePredictNavigationHandlers = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const handleViewAllPredictions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }, [navigation]);

  const handleViewAllFromPositions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      },
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

  return {
    handleViewAllPredictions,
    handleViewAllFromPositions,
    handlePositionPress,
  };
};

const usePredictPositionsSectionData = () => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { claim } = usePredictClaim();

  const {
    positions,
    isLoading: isLoadingPositions,
    error: positionsError,
    refetch: refetchPositions,
  } = usePredictPositionsForHomepage();
  const { totalClaimableValue, isLoading: isLoadingClaimable } =
    usePredictPositionsForHomepage({
      claimable: true,
    });

  const handleClaim = useCallback(async () => {
    await claim();
  }, [claim]);

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

  return {
    privacyMode,
    positions,
    isLoadingPositions,
    positionsError,
    refetchPositions,
    totalClaimableValue,
    isLoadingClaimable,
    handleClaim,
    hasPositions,
    predictHomepageUnrealizedPnl,
  };
};

const PredictionsSectionDefault = forwardRef<
  SectionRefreshHandle,
  PredictionsSectionProps
>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      sectionName: sectionNameOverride,
      titleOverride,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const queryClient = useQueryClient();
    const title = titleOverride ?? strings('homepage.sections.predictions');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PREDICT;
    const {
      handleViewAllPredictions,
      handleViewAllFromPositions,
      handlePositionPress,
    } = usePredictNavigationHandlers();
    const {
      privacyMode,
      positions,
      isLoadingPositions,
      positionsError,
      refetchPositions,
      totalClaimableValue,
      isLoadingClaimable,
      handleClaim,
      hasPositions,
      predictHomepageUnrealizedPnl,
    } = usePredictPositionsSectionData();
    const {
      markets,
      isLoading: isLoadingMarkets,
      error: marketsError,
      refetch: refetchMarkets,
    } = usePredictMarketsForHomepage(MAX_MARKETS_DISPLAYED);

    const isLoading = isLoadingPositions || isLoadingMarkets;
    const hasError =
      !isLoadingPositions &&
      !isLoadingMarkets &&
      !hasPositions &&
      markets.length === 0 &&
      (positionsError || marketsError);
    const isEmpty =
      !isLoading && !hasPositions && markets.length === 0 && !hasError;
    const willRender = isPredictEnabled && !isLoading && !isEmpty && !hasError;
    const itemCount = hasPositions ? positions.length : markets.length;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: willRender ? sectionViewRef : null,
      isLoading,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: isEmpty || !!hasError,
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

    if (!isPredictEnabled || hasError) {
      return null;
    }

    if (hasPositions || isLoadingPositions) {
      return (
        <View ref={sectionViewRef} onLayout={onLayout}>
          <HomepagePredictPositions
            title={title}
            onViewAll={handleViewAllFromPositions}
            privacyMode={privacyMode}
            isLoadingPositions={isLoadingPositions}
            positions={positions}
            isLoadingClaimable={isLoadingClaimable}
            totalClaimableValue={totalClaimableValue}
            predictHomepageUnrealizedPnl={predictHomepageUnrealizedPnl}
            onClaim={handleClaim}
            onPositionPress={handlePositionPress}
          />
        </View>
      );
    }

    if (!isLoadingMarkets && markets.length === 0) {
      return null;
    }

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <HomepagePredictTrendingMarkets
          title={title}
          onViewAll={handleViewAllPredictions}
          headerTestIdKey="predictions"
          isLoadingMarkets={isLoadingMarkets}
          markets={markets}
        />
      </View>
    );
  },
);

const PredictionsSectionPositionsOnly = forwardRef<
  SectionRefreshHandle,
  PredictionsSectionProps
>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      sectionName: sectionNameOverride,
      titleOverride,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const queryClient = useQueryClient();
    const title = titleOverride ?? strings('homepage.sections.predictions');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PREDICT;
    const { handleViewAllFromPositions, handlePositionPress } =
      usePredictNavigationHandlers();
    const {
      privacyMode,
      positions,
      isLoadingPositions,
      refetchPositions,
      totalClaimableValue,
      isLoadingClaimable,
      handleClaim,
      hasPositions,
      predictHomepageUnrealizedPnl,
    } = usePredictPositionsSectionData();

    const willRender = isPredictEnabled && !isLoadingPositions && hasPositions;
    const itemCount = hasPositions ? positions.length : 0;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: willRender ? sectionViewRef : null,
      isLoading: isLoadingPositions,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: !isLoadingPositions && !hasPositions,
      itemCount,
    });

    const refresh = useCallback(async () => {
      const addr = getEvmAccountFromSelectedAccountGroup()?.address;
      const invalidatePnl = addr
        ? queryClient.invalidateQueries({
            queryKey: predictQueries.unrealizedPnL.keys.byAddress(addr),
          })
        : Promise.resolve();
      await Promise.all([refetchPositions(), invalidatePnl]);
    }, [queryClient, refetchPositions]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    if (!isPredictEnabled || (!isLoadingPositions && !hasPositions)) {
      return null;
    }

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <HomepagePredictPositions
          title={title}
          onViewAll={handleViewAllFromPositions}
          privacyMode={privacyMode}
          isLoadingPositions={isLoadingPositions}
          positions={positions}
          isLoadingClaimable={isLoadingClaimable}
          totalClaimableValue={totalClaimableValue}
          predictHomepageUnrealizedPnl={predictHomepageUnrealizedPnl}
          onClaim={handleClaim}
          onPositionPress={handlePositionPress}
        />
      </View>
    );
  },
);

const PredictionsSectionTrendingOnly = forwardRef<
  SectionRefreshHandle,
  PredictionsSectionProps
>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      sectionName: sectionNameOverride,
      titleOverride,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const title = titleOverride ?? strings('homepage.sections.predictions');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PREDICT;
    const { handleViewAllPredictions } = usePredictNavigationHandlers();

    const {
      markets,
      isLoading: isLoadingMarkets,
      refetch: refetchMarkets,
    } = usePredictMarketsForHomepage(MAX_MARKETS_DISPLAYED);

    const itemCount = markets.length;
    const willRender = isPredictEnabled && !isLoadingMarkets && itemCount > 0;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: willRender ? sectionViewRef : null,
      isLoading: isLoadingMarkets,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: !isLoadingMarkets && itemCount === 0,
      itemCount,
    });

    useImperativeHandle(
      ref,
      () => ({
        refresh: async () => {
          await refetchMarkets();
        },
      }),
      [refetchMarkets],
    );

    if (!isPredictEnabled || (!isLoadingMarkets && itemCount === 0)) {
      return null;
    }

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <HomepagePredictTrendingMarkets
          title={title}
          onViewAll={handleViewAllPredictions}
          headerTestIdKey="trending-predictions"
          isLoadingMarkets={isLoadingMarkets}
          markets={markets}
        />
      </View>
    );
  },
);

const PredictionsSection = forwardRef<
  SectionRefreshHandle,
  PredictionsSectionProps
>(({ mode = 'default', ...props }, ref) => {
  if (mode === 'trending-only') {
    return <PredictionsSectionTrendingOnly {...props} ref={ref} />;
  }
  if (mode === 'positions-only') {
    return <PredictionsSectionPositionsOnly {...props} ref={ref} />;
  }
  return <PredictionsSectionDefault {...props} ref={ref} />;
});

export default PredictionsSection;
