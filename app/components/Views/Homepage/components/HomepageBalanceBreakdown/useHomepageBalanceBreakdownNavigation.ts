import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useMoneyNavigation } from '../../../../UI/Money/hooks/useMoneyNavigation';
import { selectIsMoneyAccountGeoEligible } from '../../../../UI/Money/selectors/eligibility';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
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
};

interface UseHomepageBalanceBreakdownNavigationArgs {
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export function useHomepageBalanceBreakdownNavigation({
  transactionActiveAbTests,
}: UseHomepageBalanceBreakdownNavigationArgs = {}) {
  const navigation = useNavigation();
  const { entryPoint, appSessionId, visitId } = useHomepageScrollContext();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );
  const { navigateToPerpsHome } = usePerpsNavigationHandlers({
    transactionActiveAbTests,
  });
  const { trackEvent, createEventBuilder } = useAnalytics();

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
          if (isMoneyAccountGeoEligible) {
            navigateToMoneyHome({ analyticsContext });
          } else {
            navigation.navigate(Routes.MONEY.MODALS.ROOT, {
              screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
            });
          }
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
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
              ...(transactionActiveAbTests?.length
                ? { transactionActiveAbTests }
                : {}),
            },
          });
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
      isMoneyAccountGeoEligible,
      navigateToPerpsHome,
      navigateToMoneyHome,
      navigation,
      trackEvent,
      transactionActiveAbTests,
      visitId,
    ],
  );

  return { openSlice };
}
