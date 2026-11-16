import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
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
import type { SectionRefreshHandle } from '../../../../../Views/Homepage/types';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../../../../Views/Homepage/hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../../../../Views/Homepage/hooks/useSectionPerformance';
import HomepageSectionUnrealizedPnlRow from '../../../../../Views/Homepage/components/HomepageSectionUnrealizedPnlRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog; the Polymarket section uses the same id
import { WalletViewSelectorsIDs } from '../../../../../Views/Wallet/WalletView.testIds';
import { useNextVenueId } from '../../../implementation';
import { PredictNextRoutes } from '../../../navigation/routes';
import { usePortfolioSummaryState } from '../../../portfolio';
import { portfolioQueries } from '../../../queries/portfolioQueries';
import type { PredictPosition } from '../../../types';
import { getEntryTitle } from '../../../utils/entryCopy';
import { PredictHomeSectionTestIds } from '../../PredictHomeSection.testIds';
import { getHomePnlRowState } from './homePnlRowState';
import { HomePositionRow, HomePositionRowSkeleton } from './HomePositionRow';
import { homePositionsQueryKey, useHomePositions } from './useHomePositions';

export interface NextPredictHomeSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * The Homepage Predictions section for a next Venue: the Polymarket
 * section's positions layout over canonical reads. It reads exactly two
 * queries, both for the Venue `NextVenueProvider` mounts it for: the
 * Portfolio Summary (the PnL row; BalanceBreakdown observes the same entry
 * for the total) and the top open Positions by value (the rows). No
 * Balance, Activity, catalog, or live quotes.
 *
 * With no open Positions, or when they fail to load, it renders nothing:
 * that is where Predictions discovery goes (PRED-1406).
 */
export const NextPredictHomeSection = forwardRef<
  SectionRefreshHandle,
  NextPredictHomeSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const venueId = useNextVenueId();
  const navigation = useNavigation<AppNavigationProp>();
  const queryClient = useQueryClient();
  const isPrivacyMode = Boolean(useSelector(selectPrivacyMode));
  const sectionViewRef = useRef<View>(null);
  const title = strings('homepage.sections.predictions');

  const positions = useHomePositions(venueId);
  const summary = usePortfolioSummaryState(venueId);

  const isLoading = positions.status === 'loading';
  const rows = positions.status === 'ready' ? positions.positions : [];
  const hasPositions = rows.length > 0;
  const isRendered = isLoading || hasPositions;

  /**
   * Refreshes through the data service, so a pull-to-refresh reads the
   * backend instead of the service's 30 s cache. Each read is replaced, not
   * added to: refreshing twice shows the same total once.
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: portfolioQueries.getPortfolioSummary(venueId).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: homePositionsQueryKey(venueId),
      }),
    ]);
  }, [queryClient, venueId]);
  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const { onLayout } = useHomeViewedEvent({
    sectionRef: hasPositions ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.PREDICT,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: !hasPositions,
    itemCount: rows.length,
  });
  useSectionPerformance({
    sectionId: HomeSectionNames.PREDICT,
    contentReady: !isLoading,
    isEmpty: positions.status === 'ready' && !hasPositions,
    contentStateForTrace: positions.status === 'error' ? 'error' : undefined,
    isLoading,
  });

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

  if (!isRendered) {
    return null;
  }

  return (
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
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions')}
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
        {isLoading ? (
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
  );
});
