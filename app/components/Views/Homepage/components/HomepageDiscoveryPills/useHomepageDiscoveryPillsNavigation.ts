import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { EXPLORE_TAB_INDEX } from '../../../../../constants/navigation/exploreTabIndices';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import type { HomepageDiscoveryPillId } from './homepageDiscoveryPills.constants';

export const HOMESCREEN_PILL_SOURCE =
  PredictEventValues.ENTRY_POINT.HOMESCREEN_PILL;

export function useHomepageDiscoveryPillsNavigation() {
  const navigation = useNavigation();

  const navigateToPill = useCallback(
    (pillId: HomepageDiscoveryPillId) => {
      switch (pillId) {
        case 'perpetuals':
          navigation.navigate(Routes.PERPS.ROOT, {
            screen: Routes.PERPS.PERPS_HOME,
            params: { source: HOMESCREEN_PILL_SOURCE },
          });
          break;
        case 'predictions':
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: HOMESCREEN_PILL_SOURCE,
            },
          });
          break;
        case 'crypto':
          navigation.navigate(Routes.TRENDING_VIEW, {
            screen: Routes.TRENDING_FEED,
            params: { initialTab: EXPLORE_TAB_INDEX.CRYPTO },
          });
          break;
        case 'stocks':
          navigation.navigate(Routes.TRENDING_VIEW, {
            screen: Routes.TRENDING_FEED,
            params: { initialTab: EXPLORE_TAB_INDEX.RWAS },
          });
          break;
        default: {
          const exhaustiveCheck: never = pillId;
          return exhaustiveCheck;
        }
      }
    },
    [navigation],
  );

  return { navigateToPill };
}
