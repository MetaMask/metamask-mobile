import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { SectionRefreshHandle } from '../../types';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import useHomeViewedEvent, {
  HomeSectionNames,
  type HomeSectionName,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import HomepagePredictWorldCupDiscovery from './components/HomepagePredictWorldCupDiscovery';
import HomepagePredictTrendingMarkets from './components/HomepagePredictTrendingMarkets';
import HomepagePredictPositions from './components/HomepagePredictPositions';
import {
  usePredictMarketsForHomepage,
  usePredictPositionsForHomepage,
  useHomepagePredictLiveWorldCupMarkets,
  useHomepagePredictWorldCupMarkets,
  useHomepagePredictWorldCupEventCount,
  usePredictHomepageDiscoveryExperiment,
} from './hooks';
import { MAX_MARKETS_DISPLAYED } from './predictionsSectionConstants';
import type { PredictionsSectionProps } from './predictionsSectionTypes';
import {
  usePredictionsCommonSetup,
  usePredictNavigationHandlers,
  useRefreshPredictPositions,
} from './hooks/usePredictionsSectionNavigation';
import { usePredictionsDefaultSectionModel } from './hooks/usePredictionsDefaultSectionModel';
import { useTreatmentDiscoveryFeedsLoading } from './hooks/useTreatmentDiscoveryFeedsLoading';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { usePredictClaim } from '../../../../UI/Predict/hooks/usePredictClaim';
import { useUnrealizedPnL } from '../../../../UI/Predict/hooks/useUnrealizedPnL';
import { getPredictHomepageUnrealizedPnlRowState } from './utils/getPredictHomepageUnrealizedPnlRowState';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PredictEventProperties,
  PredictEventValues,
} from '../../../../UI/Predict/constants/eventNames';
import {
  PredictPositionsEmptyStateVariant,
  type PredictEmptyStateCtaName,
} from '../../abTestConfig';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

/** Loads the feeds the World Cup discovery rail needs. */
const useWorldCupDiscoveryFeeds = (enabled: boolean) => ({
  worldCup: useHomepagePredictWorldCupMarkets({ enabled }),
  liveWorldCup: useHomepagePredictLiveWorldCupMarkets({ enabled }),
  worldCupEventCount: useHomepagePredictWorldCupEventCount({ enabled }),
});

const usePredictEmptyStateAnalytics = ({
  activeAbTests,
  isAssignmentActive,
  shouldTrackExposure,
  variantName,
}: {
  activeAbTests?: TransactionActiveAbTestEntry[];
  isAssignmentActive: boolean;
  shouldTrackExposure: boolean;
  variantName: string;
}) => {
  const { createEventBuilder, trackEvent } = useAnalytics();
  const viewedAssignmentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAssignmentActive || !shouldTrackExposure || !activeAbTests?.length) {
      return;
    }

    const assignmentKey =
      activeAbTests[0].key_value_pair ??
      `${activeAbTests[0].key}=${activeAbTests[0].value}`;

    if (viewedAssignmentRef.current === assignmentKey) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.PREDICT_EMPTY_STATE_VIEWED)
        .addProperties({
          [PredictEventProperties.SURFACE]: 'predict',
          [PredictEventProperties.VARIANT]: variantName,
          [PredictEventProperties.ACTIVE_AB_TESTS]: activeAbTests,
        })
        .build(),
    );
    viewedAssignmentRef.current = assignmentKey;
  }, [
    activeAbTests,
    createEventBuilder,
    isAssignmentActive,
    shouldTrackExposure,
    trackEvent,
    variantName,
  ]);

  return useCallback(
    (ctaName: PredictEmptyStateCtaName, categoryName?: string) => {
      if (
        !isAssignmentActive ||
        variantName !== PredictPositionsEmptyStateVariant.Treatment ||
        !activeAbTests?.length
      ) {
        return;
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.PREDICT_EMPTY_STATE_CTA_CLICKED)
          .addProperties({
            [PredictEventProperties.CTA_NAME]: ctaName,
            ...(categoryName && {
              [PredictEventProperties.CATEGORY_NAME]: categoryName,
            }),
            [PredictEventProperties.ACTIVE_AB_TESTS]: activeAbTests,
          })
          .build(),
      );
    },
    [
      activeAbTests,
      createEventBuilder,
      isAssignmentActive,
      trackEvent,
      variantName,
    ],
  );
};

interface PredictionsSectionShellProps {
  /** Whether to mount the section View at all. When false, returns `null`. */
  enabled: boolean;
  /**
   * Whether the section is "ready" for the viewed-event fan-out (i.e. real
   * content is on screen). Decoupled from `enabled` because some sections
   * render a loading skeleton without firing analytics.
   */
  viewed: boolean;
  refresh: () => Promise<void>;
  isLoading: boolean;
  isEmpty: boolean;
  itemCount: number;
  analyticsName: HomeSectionName;
  sectionIndex: number;
  totalSectionsLoaded: number;
  children: ReactNode;
}

/**
 * Shared boilerplate for the four `PredictionsSection*` variants:
 * mounts/unmounts the section view, wires `useHomeViewedEvent` to the layout,
 * and forwards a `refresh()` imperative handle.
 */
const PredictionsSectionShell = forwardRef<
  SectionRefreshHandle,
  PredictionsSectionShellProps
>(
  (
    {
      enabled,
      viewed,
      refresh,
      isLoading,
      isEmpty,
      itemCount,
      analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      children,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const { onLayout } = useHomeViewedEvent({
      sectionRef: viewed ? sectionViewRef : null,
      isLoading,
      sectionName: analyticsName,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty,
      itemCount,
    });
    useImperativeHandle(ref, () => ({ refresh }), [refresh]);
    if (!enabled) {
      return null;
    }
    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        {children}
      </View>
    );
  },
);

/** Co-located so `usePredictPositionsForHomepage` resolves through `jest.mock('./hooks')` in tests. */
const usePredictPositionsSectionData = (homepageQueriesEnabled: boolean) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { claim } = usePredictClaim();

  const {
    positions,
    isLoading: isLoadingPositions,
    error: positionsError,
    refetch: refetchPositions,
  } = usePredictPositionsForHomepage({
    enabled: homepageQueriesEnabled,
  });
  const { totalClaimableValue, isLoading: isLoadingClaimable } =
    usePredictPositionsForHomepage({
      claimable: true,
      enabled: homepageQueriesEnabled,
    });

  const handleClaim = useCallback(async () => {
    await claim({
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
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
    const {
      isPredictEnabled,
      queryClient,
      title,
      analyticsName,
      handleViewAllPredictions,
      handleViewAllFromPositions,
      handlePositionPress,
    } = usePredictionsCommonSetup({
      sectionNameOverride,
      titleOverride,
    });
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
    } = usePredictPositionsSectionData(isPredictEnabled);
    const {
      markets,
      isLoading: isLoadingMarkets,
      error: marketsError,
      refetch: refetchMarkets,
    } = usePredictMarketsForHomepage(MAX_MARKETS_DISPLAYED, {
      enabled: isPredictEnabled,
    });

    const {
      discoveryLayout,
      isTreatmentDiscovery,
      predictEmptyStateActiveAbTests,
      predictEmptyStateVariantName,
      isPredictEmptyStateAssignmentActive,
    } = usePredictHomepageDiscoveryExperiment();

    const {
      worldCup: worldCupHomepageMarkets,
      liveWorldCup: liveWorldCupHomepageMarkets,
      worldCupEventCount,
    } = useWorldCupDiscoveryFeeds(isPredictEnabled && isTreatmentDiscovery);
    const { refetch: refetchWorldCupHomepageMarkets } = worldCupHomepageMarkets;
    const { refetch: refetchLiveWorldCupHomepageMarkets } =
      liveWorldCupHomepageMarkets;
    const { refetch: refetchWorldCupEventCount } = worldCupEventCount;
    const isLoadingWorldCupHomepage = useTreatmentDiscoveryFeedsLoading({
      isTreatmentDiscovery,
      isWorldCupFetching:
        worldCupHomepageMarkets.isFetching ||
        liveWorldCupHomepageMarkets.isFetching ||
        worldCupEventCount.isFetching,
    });

    const {
      hasAnyPositions,
      hasError,
      isEmpty,
      showTrendingAbove,
      predictTimeToContentReady,
      willRender,
      isLoading,
      itemCount,
    } = usePredictionsDefaultSectionModel({
      isPredictEnabled,
      isLoadingPositions,
      isLoadingClaimable,
      isLoadingMarkets,
      isTreatmentDiscovery,
      isLoadingWorldCupHomepage,
      hasPositions,
      positionsLength: positions.length,
      positionsError,
      marketsError,
      marketsLength: markets.length,
      totalClaimableValue,
    });

    useSectionPerformance({
      sectionId: analyticsName,
      contentReady: predictTimeToContentReady,
      isEmpty: isEmpty && !hasError,
      contentStateForTrace: hasError ? 'error' : undefined,
      isLoading,
      enabled: isPredictEnabled,
    });

    const shouldTrackEmptyState =
      isPredictEnabled &&
      !hasError &&
      !hasAnyPositions &&
      (isTreatmentDiscovery ? willRender : !isLoading && markets.length > 0);

    const trackEmptyStateTreatmentCtaClick = usePredictEmptyStateAnalytics({
      activeAbTests: predictEmptyStateActiveAbTests,
      isAssignmentActive: isPredictEmptyStateAssignmentActive,
      shouldTrackExposure: shouldTrackEmptyState,
      variantName: predictEmptyStateVariantName,
    });

    const emptyStateTransactionActiveAbTests = shouldTrackEmptyState
      ? predictEmptyStateActiveAbTests
      : undefined;
    const discoveryTransactionActiveAbTests =
      emptyStateTransactionActiveAbTests;

    const refreshPositions = useRefreshPredictPositions({
      queryClient,
      refetchPositions,
    });

    const refresh = useCallback(async () => {
      const tasks: Promise<unknown>[] = [refreshPositions(), refetchMarkets()];
      if (isTreatmentDiscovery) {
        tasks.push(refetchWorldCupHomepageMarkets());
        tasks.push(refetchLiveWorldCupHomepageMarkets());
        tasks.push(refetchWorldCupEventCount());
      }
      await Promise.all(tasks);
    }, [
      refreshPositions,
      refetchMarkets,
      isTreatmentDiscovery,
      refetchWorldCupHomepageMarkets,
      refetchLiveWorldCupHomepageMarkets,
      refetchWorldCupEventCount,
    ]);

    const positionsLayout =
      hasAnyPositions || isLoadingPositions || isLoadingClaimable;
    // Trending-only branch is hidden when not treatment discovery and there
    // are no markets to show; mirrors the legacy early-return.
    const trendingHasNothingToShow =
      !isTreatmentDiscovery && !isLoadingMarkets && markets.length === 0;
    const enabled =
      isPredictEnabled &&
      !hasError &&
      (positionsLayout || !trendingHasNothingToShow);

    return (
      <PredictionsSectionShell
        ref={ref}
        enabled={enabled}
        viewed={willRender}
        refresh={refresh}
        isLoading={isLoading}
        isEmpty={isEmpty || !!hasError}
        itemCount={itemCount}
        analyticsName={analyticsName}
        sectionIndex={sectionIndex}
        totalSectionsLoaded={totalSectionsLoaded}
      >
        {positionsLayout ? (
          <>
            {showTrendingAbove && (
              <Box paddingBottom={3}>
                <HomepagePredictTrendingMarkets
                  title={title}
                  onViewAll={handleViewAllPredictions}
                  headerTestIdKey="predictions"
                  discoveryLayout={discoveryLayout}
                  isLoadingMarkets={isLoadingMarkets}
                  markets={markets}
                  transactionActiveAbTests={discoveryTransactionActiveAbTests}
                  worldCupHomepage={worldCupHomepageMarkets}
                  liveWorldCupHomepage={liveWorldCupHomepageMarkets}
                  worldCupEventCount={worldCupEventCount.eventCount}
                  emptyStateTransactionActiveAbTests={
                    discoveryTransactionActiveAbTests
                  }
                  onEmptyStateTreatmentCtaClick={
                    shouldTrackEmptyState
                      ? trackEmptyStateTreatmentCtaClick
                      : undefined
                  }
                />
              </Box>
            )}
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
              showHeader={!showTrendingAbove}
            />
          </>
        ) : (
          <Box paddingBottom={3}>
            <HomepagePredictTrendingMarkets
              title={title}
              onViewAll={handleViewAllPredictions}
              headerTestIdKey="predictions"
              discoveryLayout={discoveryLayout}
              isLoadingMarkets={isLoadingMarkets}
              markets={markets}
              transactionActiveAbTests={discoveryTransactionActiveAbTests}
              worldCupHomepage={worldCupHomepageMarkets}
              liveWorldCupHomepage={liveWorldCupHomepageMarkets}
              worldCupEventCount={worldCupEventCount.eventCount}
              emptyStateTransactionActiveAbTests={
                discoveryTransactionActiveAbTests
              }
              onEmptyStateTreatmentCtaClick={
                shouldTrackEmptyState
                  ? trackEmptyStateTreatmentCtaClick
                  : undefined
              }
            />
          </Box>
        )}
      </PredictionsSectionShell>
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
    const {
      isPredictEnabled,
      queryClient,
      title,
      analyticsName,
      handleViewAllFromPositions,
      handlePositionPress,
    } = usePredictionsCommonSetup({
      sectionNameOverride,
      titleOverride,
    });
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
    } = usePredictPositionsSectionData(isPredictEnabled);

    const hasClaimablePositions =
      !isLoadingClaimable && totalClaimableValue > 0;
    const hasAnyPositions = hasPositions || hasClaimablePositions;
    const isLoading = isLoadingPositions || isLoadingClaimable;
    const willRender = isPredictEnabled && !isLoading && hasAnyPositions;
    const itemCount = hasPositions
      ? positions.length
      : hasClaimablePositions
        ? 1
        : 0;

    const refresh = useRefreshPredictPositions({
      queryClient,
      refetchPositions,
    });

    return (
      <PredictionsSectionShell
        ref={ref}
        enabled={isPredictEnabled && (isLoading || hasAnyPositions)}
        viewed={willRender}
        refresh={refresh}
        isLoading={isLoading}
        isEmpty={!isLoading && !hasAnyPositions}
        itemCount={itemCount}
        analyticsName={analyticsName}
        sectionIndex={sectionIndex}
        totalSectionsLoaded={totalSectionsLoaded}
      >
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
      </PredictionsSectionShell>
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
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const title = titleOverride ?? strings('homepage.sections.predictions');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PREDICT;
    const { handleViewAllPredictions } = usePredictNavigationHandlers();

    const {
      markets,
      isLoading: isLoadingMarkets,
      refetch: refetchMarkets,
    } = usePredictMarketsForHomepage(MAX_MARKETS_DISPLAYED, {
      enabled: isPredictEnabled,
    });

    const { discoveryLayout } = usePredictHomepageDiscoveryExperiment();

    const isListLayout = discoveryLayout === 'list';
    const {
      worldCup: worldCupHomepageMarkets,
      liveWorldCup: liveWorldCupHomepageMarkets,
      worldCupEventCount,
    } = useWorldCupDiscoveryFeeds(isPredictEnabled && isListLayout);
    const { refetch: refetchWorldCupHomepageMarkets } = worldCupHomepageMarkets;
    const { refetch: refetchLiveWorldCupHomepageMarkets } =
      liveWorldCupHomepageMarkets;
    const { refetch: refetchWorldCupEventCount } = worldCupEventCount;

    const itemCount = isListLayout ? 1 : markets.length;
    const willRender =
      isPredictEnabled &&
      (isListLayout || (!isLoadingMarkets && itemCount > 0));

    const refresh = useCallback(async () => {
      const tasks: Promise<unknown>[] = [refetchMarkets()];
      if (isListLayout) {
        tasks.push(refetchWorldCupHomepageMarkets());
        tasks.push(refetchLiveWorldCupHomepageMarkets());
        tasks.push(refetchWorldCupEventCount());
      }
      await Promise.all(tasks);
    }, [
      refetchMarkets,
      isListLayout,
      refetchWorldCupHomepageMarkets,
      refetchLiveWorldCupHomepageMarkets,
      refetchWorldCupEventCount,
    ]);

    return (
      <PredictionsSectionShell
        ref={ref}
        enabled={
          isPredictEnabled &&
          (isListLayout || isLoadingMarkets || markets.length > 0)
        }
        viewed={willRender}
        refresh={refresh}
        isLoading={
          isListLayout
            ? worldCupHomepageMarkets.isFetching ||
              liveWorldCupHomepageMarkets.isFetching ||
              worldCupEventCount.isFetching
            : isLoadingMarkets
        }
        isEmpty={isListLayout ? false : !isLoadingMarkets && itemCount === 0}
        itemCount={itemCount}
        analyticsName={analyticsName}
        sectionIndex={sectionIndex}
        totalSectionsLoaded={totalSectionsLoaded}
      >
        <Box paddingBottom={3}>
          <HomepagePredictTrendingMarkets
            title={title}
            onViewAll={handleViewAllPredictions}
            headerTestIdKey="trending-predictions"
            discoveryLayout={discoveryLayout}
            isLoadingMarkets={isLoadingMarkets}
            markets={markets}
            worldCupHomepage={worldCupHomepageMarkets}
            liveWorldCupHomepage={liveWorldCupHomepageMarkets}
            worldCupEventCount={worldCupEventCount.eventCount}
          />
        </Box>
      </PredictionsSectionShell>
    );
  },
);

/**
 * Sports-only section: World Cup discovery rail (BTC row, men's summary, winner market, bracket pills).
 * Renders whenever Predict is enabled.
 */
const PredictionsSectionSportsOnly = forwardRef<
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
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const title = titleOverride ?? strings('homepage.sections.predictions');
    const analyticsName = sectionNameOverride ?? HomeSectionNames.PREDICT;
    const { handleViewAllPredictions } = usePredictNavigationHandlers();

    const {
      worldCup: worldCupHomepageMarkets,
      liveWorldCup: liveWorldCupHomepageMarkets,
      worldCupEventCount,
    } = useWorldCupDiscoveryFeeds(isPredictEnabled);
    const { refetch: refetchWorldCupHomepageMarkets } = worldCupHomepageMarkets;
    const { refetch: refetchLiveWorldCupHomepageMarkets } =
      liveWorldCupHomepageMarkets;
    const { refetch: refetchWorldCupEventCount } = worldCupEventCount;

    const refresh = useCallback(async () => {
      await Promise.all([
        refetchWorldCupHomepageMarkets(),
        refetchLiveWorldCupHomepageMarkets(),
        refetchWorldCupEventCount(),
      ]);
    }, [
      refetchWorldCupHomepageMarkets,
      refetchLiveWorldCupHomepageMarkets,
      refetchWorldCupEventCount,
    ]);

    return (
      <PredictionsSectionShell
        ref={ref}
        enabled={isPredictEnabled}
        viewed={isPredictEnabled}
        refresh={refresh}
        isLoading={
          worldCupHomepageMarkets.isFetching ||
          liveWorldCupHomepageMarkets.isFetching ||
          worldCupEventCount.isFetching
        }
        isEmpty={false}
        itemCount={1}
        analyticsName={analyticsName}
        sectionIndex={sectionIndex}
        totalSectionsLoaded={totalSectionsLoaded}
      >
        <Box paddingBottom={3}>
          <HomepagePredictWorldCupDiscovery
            title={title}
            onViewAll={handleViewAllPredictions}
            headerTestIdKey="trending-predictions"
            worldCup={worldCupHomepageMarkets}
            liveWorldCup={liveWorldCupHomepageMarkets}
            worldCupEventCount={worldCupEventCount.eventCount}
          />
        </Box>
      </PredictionsSectionShell>
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
  if (mode === 'sports') {
    return <PredictionsSectionSportsOnly {...props} ref={ref} />;
  }
  return <PredictionsSectionDefault {...props} ref={ref} />;
});

export default PredictionsSection;
