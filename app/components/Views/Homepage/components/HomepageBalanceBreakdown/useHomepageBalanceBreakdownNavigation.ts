import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useMoneyNavigation } from '../../../../UI/Money/hooks/useMoneyNavigation';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { usePerpsNavigationHandlers } from '../../Sections/Perpetuals/hooks/usePerpsNavigationHandlers';
import type { SliceKey } from '../../BalanceBreakdown/types';
import { useHomepageScrollContext } from '../../context/HomepageScrollContext';
import { HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT } from '../../abTestConfig';

const BALANCE_BREAKDOWN_SECTION_NAMES: Record<SliceKey, string> = {
  money: 'money',
  tokens: 'tokens',
  perps: 'perpetuals',
  predict: 'predictions',
  defi: 'defi',
};

export function useHomepageBalanceBreakdownNavigation() {
  const navigation = useNavigation();
  const { entryPoint, appSessionId, visitId } = useHomepageScrollContext();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { handleViewAllPerps } = usePerpsNavigationHandlers({
    source: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
  });
  const { trackEvent, createEventBuilder } = useAnalytics();

  const openSlice = useCallback(
    (key: SliceKey, position: number) => {
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
          navigateToMoneyHome(HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT);
          break;
        case 'tokens':
          navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
          break;
        case 'perps':
          handleViewAllPerps();
          break;
        case 'predict':
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
            },
          });
          break;
        case 'defi':
          navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW);
          break;
      }
    },
    [
      createEventBuilder,
      entryPoint,
      appSessionId,
      handleViewAllPerps,
      navigateToMoneyHome,
      navigation,
      trackEvent,
      visitId,
    ],
  );

  return { openSlice };
}
