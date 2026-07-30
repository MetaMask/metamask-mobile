import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { useMoneyNavigation } from '../../../../UI/Money/hooks/useMoneyNavigation';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { usePerpsNavigationHandlers } from '../../Sections/Perpetuals/hooks/usePerpsNavigationHandlers';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SliceKey } from '../../../BalanceBreakdown/types';

export function useHomepageBalanceBreakdownNavigation() {
  const navigation = useNavigation();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { handleViewAllPerps } = usePerpsNavigationHandlers();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const openSlice = useCallback(
    (key: SliceKey) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.BALANCE_BREAKDOWN_SLICE_TAPPED)
          .addProperties({
            slice: key,
            source: 'homepage',
          })
          .build(),
      );

      switch (key) {
        case 'money':
          navigateToMoneyHome();
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
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
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
      handleViewAllPerps,
      navigateToMoneyHome,
      navigation,
      trackEvent,
    ],
  );

  return { openSlice };
}
