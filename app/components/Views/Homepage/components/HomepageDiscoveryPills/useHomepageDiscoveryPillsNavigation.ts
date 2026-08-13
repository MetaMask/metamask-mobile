import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Routes from '../../../../../constants/navigation/Routes';
import { analytics } from '../../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import {
  toPerpsNavigatorScreenParams,
  useGetPerpsHomeNavigationTarget,
} from '../../../../UI/Perps/utils/perpsModeSwitch';
import type { HomepageDiscoveryPillId } from './homepageDiscoveryPills.constants';

export const HOMESCREEN_PILL_SOURCE =
  PredictEventValues.ENTRY_POINT.HOMESCREEN_PILL;

const trackDiscoveryPillExploreNavigate = (
  properties: Record<string, unknown>,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.EXPLORE_INTERACTED,
    )
      .addProperties(properties)
      .build(),
  );
};

export function useHomepageDiscoveryPillsNavigation() {
  const navigation = useNavigation<AppNavigationProp>();
  const getPerpsHomeNavigationTarget = useGetPerpsHomeNavigationTarget();

  const navigateToPill = useCallback(
    (pillId: HomepageDiscoveryPillId) => {
      switch (pillId) {
        case 'perpetuals': {
          const target = getPerpsHomeNavigationTarget({
            source: HOMESCREEN_PILL_SOURCE,
          });
          navigation.navigate(
            Routes.PERPS.ROOT,
            toPerpsNavigatorScreenParams(target),
          );
          break;
        }
        case 'predictions':
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: HOMESCREEN_PILL_SOURCE,
            },
          });
          break;
        case 'crypto':
          trackDiscoveryPillExploreNavigate({
            interaction_type: 'section_see_all_tapped',
            tab_name: 'Crypto',
            section_name: 'tokens_trending',
            source: HOMESCREEN_PILL_SOURCE,
          });
          navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
          break;
        case 'stocks':
          trackDiscoveryPillExploreNavigate({
            interaction_type: 'section_see_all_tapped',
            tab_name: 'RWAs',
            section_name: 'stocks',
            source: HOMESCREEN_PILL_SOURCE,
          });
          navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW);
          break;
        default: {
          const exhaustiveCheck: never = pillId;
          return exhaustiveCheck;
        }
      }
    },
    [navigation, getPerpsHomeNavigationTarget],
  );

  return { navigateToPill };
}
