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
  useHomepagePredictTaggedMarkets,
  HOMEPAGE_PREDICT_TAG_QUERIES,
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
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { usePredictClaim } from '../../../../UI/Predict/hooks/usePredictClaim';
import { useUnrealizedPnL } from '../../../../UI/Predict/hooks/useUnrealizedPnL';
import { getPredictHomepageUnrealizedPnlRowState } from './utils/getPredictHomepageUnrealizedPnlRowState';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PredictEventProperties } from '../../../../UI/Predict/constants/eventNames';
import {
  PredictPositionsEmptyStateVariant,
  type PredictEmptyStateCtaName,
} from '../../abTestConfig';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

/** Loads both feeds the World Cup discovery rail needs (World Cup tag + NBA Champion event). */
const useWorldCupDiscoveryFeeds = (enabled: boolean) => ({
  worldCup: useHomepagePredictTaggedMarkets({
    enabled,
    customQueryParams: HOMEPAGE_PREDICT_TAG_QUERIES.worldCup,
  }),
  nbaChampion: useHomepagePredictTaggedMarkets({
    enabled,
    customQueryParams: HOMEPAGE_PREDICT_TAG_QUERIES.nbaChampion,
  }),
});

const mergeActiveAbTests = (
  ...testGroups: (TransactionActiveAbTestEntry[] | undefined)[]
): TransactionActiveAbTestEntry[] | undefined => {
  const merged = new Map<string, TransactionActiveAbTestEntry>();

  testGroups.flat().forEach((assignment) => {
    if (!assignment) {
      return;
    }
    merged.set(assignment.key, assignment);
  });

  return merged.size > 0 ? Array.from(merged.values()) : undefined;
};

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
      trendingTransactionActiveAbTests,
      predictEmptyStateActiveAbTests,
      predictEmptyStateVariantName,
      isPredictEmptyStateAssignmentActive,
    } = usePredictHomepageDiscoveryExperiment();

    const {
      worldCup: worldCupHomepageMarkets,
      nbaChampion: nbaChampionHomepageMarkets,
    } = useWorldCupDiscoveryFeeds(isPredictEnabled && isTreatmentDiscovery);
    const { refetch: refetchWorldCupHomepageMarkets } = worldCupHomepageMarkets;
    const { refetch: refetchNbaChampionHomepageMarkets } =
      nbaChampionHomepageMarkets;
    const isLoadingWorldCupHomepage =
      worldCupHomepageMarkets.isFetching ||
      nbaChampionHomepageMarkets.isFetching;

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
      !isLoading &&
      !hasAnyPositions &&
      (isTreatmentDiscovery || markets.length > 0);

    const trackEmptyStateTreatmentCtaClick = usePredictEmptyStateAnalytics({
      activeAbTests: predictEmptyStateActiveAbTests,
      isAssignmentActive: isPredictEmptyStateAssignmentActive,
      shouldTrackExposure: shouldTrackEmptyState,
      variantName: predictEmptyStateVariantName,
    });

    const emptyStateTransactionActiveAbTests = shouldTrackEmptyState
      ? predictEmptyStateActiveAbTests
      : undefined;
    const discoveryTransactionActiveAbTests = mergeActiveAbTests(
      trendingTransactionActiveAbTests,
      emptyStateTransactionActiveAbTests,
    );

    const refreshPositions = useRefreshPredictPositions({
      queryClient,
      refetchPositions,
    });

    const refresh = useCallback(async () => {
      const tasks: Promise<unknown>[] = [refreshPositions(), refetchMarkets()];
      if (isTreatmentDiscovery) {
        tasks.push(refetchWorldCupHomepageMarkets());
        tasks.push(refetchNbaChampionHomepageMarkets());
      }
      await Promise.all(tasks);
    }, [
      refreshPositions,
      refetchMarkets,
      isTreatmentDiscovery,
      refetchWorldCupHomepageMarkets,
      refetchNbaChampionHomepageMarkets,
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
                  nbaChampionHomepage={nbaChampionHomepageMarkets}
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
          <HomepagePredictTrendingMarkets
            title={title}
            onViewAll={handleViewAllPredictions}
            headerTestIdKey="predictions"
            discoveryLayout={discoveryLayout}
            isLoadingMarkets={isLoadingMarkets}
            markets={markets}
            transactionActiveAbTests={discoveryTransactionActiveAbTests}
            worldCupHomepage={worldCupHomepageMarkets}
            nbaChampionHomepage={nbaChampionHomepageMarkets}
            emptyStateTransactionActiveAbTests={
              discoveryTransactionActiveAbTests
            }
            onEmptyStateTreatmentCtaClick={
              shouldTrackEmptyState
                ? trackEmptyStateTreatmentCtaClick
                : undefined
            }
          />
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

    const { discoveryLayout, trendingTransactionActiveAbTests } =
      usePredictHomepageDiscoveryExperiment();

    const isListLayout = discoveryLayout === 'list';
    const {
      worldCup: worldCupHomepageMarkets,
      nbaChampion: nbaChampionHomepageMarkets,
    } = useWorldCupDiscoveryFeeds(isPredictEnabled && isListLayout);
    const { refetch: refetchWorldCupHomepageMarkets } = worldCupHomepageMarkets;
    const { refetch: refetchNbaChampionHomepageMarkets } =
      nbaChampionHomepageMarkets;

    const itemCount = isListLayout ? 1 : markets.length;
    const willRender =
      isPredictEnabled &&
      (isListLayout || (!isLoadingMarkets && itemCount > 0));

    const refresh = useCallback(async () => {
      const tasks: Promise<unknown>[] = [refetchMarkets()];
      if (isListLayout) {
        tasks.push(refetchWorldCupHomepageMarkets());
        tasks.push(refetchNbaChampionHomepageMarkets());
      }
      await Promise.all(tasks);
    }, [
      refetchMarkets,
      isListLayout,
      refetchWorldCupHomepageMarkets,
      refetchNbaChampionHomepageMarkets,
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
              nbaChampionHomepageMarkets.isFetching
            : isLoadingMarkets
        }
        isEmpty={isListLayout ? false : !isLoadingMarkets && itemCount === 0}
        itemCount={itemCount}
        analyticsName={analyticsName}
        sectionIndex={sectionIndex}
        totalSectionsLoaded={totalSectionsLoaded}
      >
        <HomepagePredictTrendingMarkets
          title={title}
          onViewAll={handleViewAllPredictions}
          headerTestIdKey="trending-predictions"
          discoveryLayout={discoveryLayout}
          isLoadingMarkets={isLoadingMarkets}
          markets={markets}
          transactionActiveAbTests={trendingTransactionActiveAbTests}
          emptyStateTransactionActiveAbTests={trendingTransactionActiveAbTests}
          worldCupHomepage={worldCupHomepageMarkets}
          nbaChampionHomepage={nbaChampionHomepageMarkets}
        />
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
      nbaChampion: nbaChampionHomepageMarkets,
    } = useWorldCupDiscoveryFeeds(isPredictEnabled);
    const { refetch: refetchWorldCupHomepageMarkets } = worldCupHomepageMarkets;
    const { refetch: refetchNbaChampionHomepageMarkets } =
      nbaChampionHomepageMarkets;

    const refresh = useCallback(async () => {
      await Promise.all([
        refetchWorldCupHomepageMarkets(),
        refetchNbaChampionHomepageMarkets(),
      ]);
    }, [refetchWorldCupHomepageMarkets, refetchNbaChampionHomepageMarkets]);

    return (
      <PredictionsSectionShell
        ref={ref}
        enabled={isPredictEnabled}
        viewed={isPredictEnabled}
        refresh={refresh}
        isLoading={
          worldCupHomepageMarkets.isFetching ||
          nbaChampionHomepageMarkets.isFetching
        }
        isEmpty={false}
        itemCount={1}
        analyticsName={analyticsName}
        sectionIndex={sectionIndex}
        totalSectionsLoaded={totalSectionsLoaded}
      >
        <HomepagePredictWorldCupDiscovery
          title={title}
          onViewAll={handleViewAllPredictions}
          headerTestIdKey="trending-predictions"
          worldCup={worldCupHomepageMarkets}
          nbaChampion={nbaChampionHomepageMarkets}
        />
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
