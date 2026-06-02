import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import type { PredictEntryPoint } from '../../../../UI/Predict/types/navigation';
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
  entryPoint: PredictEntryPoint = PredictEventValues.ENTRY_POINT.EXPLORE,
): void => {
  const tab = VARIANT_TO_TAB[variant];
  navigation.navigate(Routes.PREDICT.ROOT, {
    screen: Routes.PREDICT.MARKET_LIST,
    params: {
      entryPoint,
      ...(tab && { tab }),
    },
  });
};

/** Navigate from Explore prediction sections to the Predict market list. */
export const navigateToExplorePredictionsList = (
  navigation: AppNavigationProp,
  variant: PredictionsVariant,
): void => {
  navigateToPredictionsList(
    navigation,
    variant,
    PredictEventValues.ENTRY_POINT.EXPLORE,
  );
};
