import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { PredictionsVariant } from './usePredictionsFeed';

const VARIANT_TO_TAB: Record<PredictionsVariant, string | undefined> = {
  trending: undefined,
  sports: 'sports',
  crypto: 'crypto',
  politics: 'politics',
};

/** Navigate to the Predict market list, optionally pre-selecting a tab. */
export const navigateToPredictionsList = (
  navigation: AppNavigationProp,
  variant: PredictionsVariant,
): void => {
  const tab = VARIANT_TO_TAB[variant];
  navigation.navigate(Routes.PREDICT.ROOT, {
    screen: Routes.PREDICT.MARKET_LIST,
    params: tab ? { tab } : undefined,
  });
};
