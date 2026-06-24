import { RampIntent } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

export function createSellNavigationDetails(intent?: RampIntent) {
  if (!intent) {
    return [Routes.RAMP.SELL] as const;
  }
  return [
    Routes.RAMP.SELL,
    {
      screen: Routes.RAMP.ID,
      params: {
        screen: Routes.RAMP.BUILD_QUOTE,
        params: intent,
      },
    },
  ] as const;
}
