import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import type {
  HomeSectionMode,
  SectionRefreshHandle,
} from '../../../../../Views/Homepage/types';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../../../../Views/Homepage/hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../../../../Views/Homepage/hooks/useSectionPerformance';
import useSectionViewportVisible from '../../../../../Views/Homepage/hooks/useSectionViewportVisible';
import HomepageSectionUnrealizedPnlRow from '../../../../../Views/Homepage/components/HomepageSectionUnrealizedPnlRow';
import { UiSlotRenderer } from '../../../../UiSlots/UiSlotRenderer';
import { useUiSlotsScreen } from '../../../../UiSlots/hooks/useUiSlotsScreen';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog; the Polymarket section uses the same id
import { WalletViewSelectorsIDs } from '../../../../../Views/Wallet/WalletView.testIds';
import { useNextVenueId } from '../../../implementation';
import { PredictNextRoutes } from '../../../navigation/routes';
import { usePortfolioSummaryState } from '../../../portfolio';
import { marketDataQueries } from '../../../queries/marketDataQueries';
import { portfolioQueries } from '../../../queries/portfolioQueries';
import type { PredictPosition } from '../../../types';
import { getEntryTitle } from '../../../utils/entryCopy';
import { PredictOrderFlowProvider } from '../../../views/PredictOrderFlow';
import { PredictHomeSectionTestIds } from '../../PredictHomeSection.testIds';
import { getHomePnlRowState } from './homePnlRowState';
import { HomePositionRow, HomePositionRowSkeleton } from './HomePositionRow';
import {
  HomeDiscoveryHostContext,
  type HomeDiscoveryHost,
  type HomeDiscoveryState,
} from './homeDiscoveryHost';
import { NextHomeDiscovery } from './NextHomeDiscovery';
import { homePositionsQueryKey, useHomePositions } from './useHomePositions';

/** The UI Slot the Polymarket section renders its discovery list through. */
const DISCOVERY_SLOT_ID = 'wallet-home.predict-empty-state';
const DISCOVERY_LOADING: HomeDiscoveryState = { status: 'loading' };

export interface NextPredictHomeSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /**
   * `sports` shows discovery only, as the Polymarket sports-only section
   * does. @default 'default'
   */
  mode?: HomeSectionMode;
}

/**
 * The Homepage Predictions section for a next Venue, laid out like the
 * Polymarket section. With open Positions it lists the top ones by value
 * under the Summary PnL (no Balance, Activity or live quotes). Without them,
 * or when they fail to load, it shows Predictions discovery for the slots
 * the Venue's descriptor supports, through the same UI Slot as Polymarket.
 * With nothing to show it renders nothing.
 *
 * It mounts the Order flow, so a discovery card's outcome buttons open the
 * PredictNext Order sheet over the Homepage.
 */
export const NextPredictHomeSection = forwardRef<
  SectionRefreshHandle,
  NextPredictHomeSectionProps
>(({ sectionIndex, totalSectionsLoaded, mode = 'default' }, ref) => {
  const venueId = useNextVenueId();
  const navigation = useNavigation<AppNavigationProp>();
  const queryClient = useQueryClient();
  const isPrivacyMode = Boolean(useSelector(selectPrivacyMode));
  const sectionViewRef = useRef<View>(null);
  const title = strings('homepage.sections.predictions');

  const showsPositions = mode !== 'sports';
  const positions = useHomePositions(venueId, { enabled: showsPositions });
  const summary = usePortfolioSummaryState(venueId, {
    enabled: showsPositions,
  });

  const rows = positions.status === 'ready' ? positions.positions : [];
  const hasPositions = showsPositions && rows.length > 0;
  const isPositionsLoading = showsPositions && positions.status === 'loading';
  const showsDiscovery = !isPositionsLoading && !hasPositions;

  const [discovery, setDiscovery] =
    useState<HomeDiscoveryState>(DISCOVERY_LOADING);
  const isDiscoveryLoading = showsDiscovery && discovery.status === 'loading';
  const discoveryCount =
    showsDiscovery && discovery.status === 'ready' ? discovery.itemCount : 0;
  const isLoading = isPositionsLoading || isDiscoveryLoading;
  const isRendered =
    isPositionsLoading ||
    hasPositions ||
    (showsDiscovery && discovery.status !== 'hidden');
  const itemCount = hasPositions ? rows.length : discoveryCount;

  const refreshUiSlots = useUiSlotsScreen('wallet-home', showsDiscovery);
  const { isVisible, onLayout: onVisibilityLayout } =
    useSectionViewportVisible(sectionViewRef);
  const discoveryHost = useMemo<HomeDiscoveryHost>(
    () => ({ isVisible, onStateChange: setDiscovery }),
    [isVisible],
  );

  /**
   * Refreshes through the data service, so a pull-to-refresh reads the
   * backend instead of the service's cache. Each read is replaced, not
   * added to: refreshing twice shows the same total once. Discovery
   * re-reads the catalog, its Feeds and the UI Slots assignment.
   */
  const refresh = useCallback(async () => {
    const reads: Promise<unknown>[] = [];
    if (showsPositions) {
      reads.push(
        queryClient.invalidateQueries({
          queryKey: portfolioQueries.getPortfolioSummary(venueId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: homePositionsQueryKey(venueId),
        }),
      );
    }
    if (showsDiscovery) {
      reads.push(
        queryClient.invalidateQueries({
          queryKey: marketDataQueries.getVenueCatalog(venueId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: ['PredictMarketDataService:getFeed', venueId],
        }),
        refreshUiSlots(),
      );
    }
    await Promise.all(reads);
  }, [queryClient, refreshUiSlots, showsDiscovery, showsPositions, venueId]);
  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const { onLayout: onViewedLayout } = useHomeViewedEvent({
    sectionRef: isRendered && !isLoading ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.PREDICT,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: itemCount === 0,
    itemCount,
  });
  useSectionPerformance({
    sectionId: HomeSectionNames.PREDICT,
    contentReady: !isLoading,
    isEmpty: !isLoading && itemCount === 0,
    contentStateForTrace:
      showsDiscovery &&
      discovery.status === 'hidden' &&
      discovery.reason === 'error'
        ? 'error'
        : undefined,
    isLoading,
  });
  const onLayout = useCallback(() => {
    onViewedLayout();
    onVisibilityLayout();
  }, [onViewedLayout, onVisibilityLayout]);

  const openHome = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: PredictNextRoutes.HOME,
    });
  }, [navigation]);

  const openEvent = useCallback(
    (position: PredictPosition) => {
      if (!position.context) return;
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: PredictNextRoutes.EVENT,
        params: {
          venueId,
          eventId: position.context.eventId,
          titleSnapshot: getEntryTitle(position.context),
        },
      });
    },
    [navigation, venueId],
  );

  const pnlRow = useMemo(
    () => getHomePnlRowState({ summary, isPrivacyMode }),
    [summary, isPrivacyMode],
  );

  // The Order flow wraps both layouts, so a sheet opened from discovery
  // survives the switch to Positions that its own fill causes.
  return (
    <PredictOrderFlowProvider>
      {showsDiscovery ? (
        // Mounted while hidden too: discovery reports its own state, and an
        // empty View lays out at zero height.
        <View
          ref={sectionViewRef}
          onLayout={onLayout}
          testID={PredictHomeSectionTestIds.DISCOVERY_SECTION}
        >
          <HomeDiscoveryHostContext.Provider value={discoveryHost}>
            <UiSlotRenderer
              screenId="wallet-home"
              slotId={DISCOVERY_SLOT_ID}
              fallback={<NextHomeDiscovery />}
              fallbackOnEmpty
            />
          </HomeDiscoveryHostContext.Provider>
        </View>
      ) : (
        <View
          ref={sectionViewRef}
          onLayout={onLayout}
          testID={PredictHomeSectionTestIds.POSITIONS}
        >
          <SectionDivider />
          <SectionHeader
            title={title}
            isInteractive
            onPress={openHome}
            testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(
              'predictions',
            )}
          />
          {hasPositions && pnlRow.show ? (
            <HomepageSectionUnrealizedPnlRow
              isLoading={pnlRow.isLoading}
              valueText={pnlRow.valueText}
              tone={pnlRow.tone}
              label={strings('predict_next.portfolio.unrealized_pnl')}
              testID={PredictHomeSectionTestIds.UNREALIZED_PNL}
            />
          ) : null}
          <Box gap={3}>
            {isPositionsLoading ? (
              <>
                <HomePositionRowSkeleton />
                <HomePositionRowSkeleton />
              </>
            ) : (
              rows.map((position) => (
                <HomePositionRow
                  key={`${position.marketId}-${position.side}`}
                  position={position}
                  isPrivacyMode={isPrivacyMode}
                  onPress={position.context ? openEvent : undefined}
                />
              ))
            )}
          </Box>
        </View>
      )}
    </PredictOrderFlowProvider>
  );
});
