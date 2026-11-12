import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectCollectiblesHasCompletedOnboarding } from '../../../../UI/Collectibles/selectors/onboarding';
import type {
  CollectiblesEntryDestination,
  CollectiblesHomeParams,
} from '../../../../UI/Collectibles/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useMoneyHomeNavigation } from '../../../../UI/Money/hooks/useMoneyHomeNavigation';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { usePredictEntryActions } from '../../../../UI/PredictNext';
import { usePerpsNavigationHandlers } from '../../Sections/Perpetuals/hooks/usePerpsNavigationHandlers';
import type { SliceKey } from '../../BalanceBreakdown/types';
import { useHomepageScrollContext } from '../../context/HomepageScrollContext';
import { HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT } from '../../abTestConfig';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import {
  createNavigationAnalyticsContext,
  NavigationAnalyticsAttribution,
} from '../../../../../util/analytics/navigationAnalyticsAttribution';

const BALANCE_BREAKDOWN_SECTION_NAMES: Record<SliceKey, string> = {
  money: 'money',
  tokens: 'tokens',
  perps: 'perpetuals',
  predict: 'predictions',
  defi: 'defi',
  collectibles: 'collectibles',
};

interface UseHomepageBalanceBreakdownNavigationArgs {
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export function useHomepageBalanceBreakdownNavigation({
  transactionActiveAbTests,
}: UseHomepageBalanceBreakdownNavigationArgs = {}) {
  const navigation = useNavigation();
  const hasCompletedCollectiblesOnboarding = useSelector(
    selectCollectiblesHasCompletedOnboarding,
  );
  const { entryPoint, appSessionId, visitId } = useHomepageScrollContext();
  const { navigateToMoneyHome } = useMoneyHomeNavigation();
  const { navigateToPerpsHome } = usePerpsNavigationHandlers({
    transactionActiveAbTests,
  });
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { openPredict } = usePredictEntryActions();

  const openSlice = useCallback(
    (key: SliceKey, position: number) => {
      const analyticsContext = createNavigationAnalyticsContext(
        NavigationAnalyticsAttribution.HomepageBalanceBreakdown,
      );
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HOME_VIEWED)
          .addProperties({
            interaction_type: 'balance_breakdown_row_tapped',
            location: 'home',
            section_name: BALANCE_BREAKDOWN_SECTION_NAMES[key],
            position,
            entry_point: entryPoint,
            app_session_id: appSessionId,
            visit_number: visitId,
          })
          .build(),
      );

      switch (key) {
        case 'money':
          navigateToMoneyHome({ analyticsContext });
          break;
        case 'tokens':
          navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW, {
            analyticsContext,
          });
          break;
        case 'perps':
          navigateToPerpsHome(analyticsContext);
          break;
        case 'predict':
          openPredict({
            type: 'home',
            entryPoint: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
            transactionActiveAbTests,
          });
          break;
        case 'collectibles':
          navigation.navigate(
            Routes.COLLECTIBLES.ROOT,
            hasCompletedCollectiblesOnboarding
              ? {
                  screen: Routes.COLLECTIBLES.HOME,
                  params: {
                    initialTab: 'cards',
                  } satisfies CollectiblesHomeParams,
                }
              : {
                  screen: Routes.COLLECTIBLES.ONBOARDING,
                  params: {
                    destination: {
                      kind: 'home',
                      tab: 'cards',
                    } satisfies CollectiblesEntryDestination,
                  },
                },
          );
          break;
        case 'defi':
          navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW, {
            analyticsContext,
          });
          break;
      }
    },
    [
      createEventBuilder,
      entryPoint,
      appSessionId,
      navigateToPerpsHome,
      navigateToMoneyHome,
      navigation,
      hasCompletedCollectiblesOnboarding,
      openPredict,
      trackEvent,
      transactionActiveAbTests,
      visitId,
    ],
  );

  return { openSlice };
}
