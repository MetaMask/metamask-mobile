import { RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';

const RAMP_ACTIVITY = 'activity';

export default function handleRedirection(
  paths: string[],
  _pathParams: Record<string, string> | undefined,
  _rampType: RampType,
) {
  switch (paths[0]) {
    case RAMP_ACTIVITY: {
      NavigationService.navigation.navigate(Routes.TRANSACTIONS_VIEW, {
        screen: Routes.TRANSACTIONS_VIEW,
        params: {
          redirectToOrders: true,
        },
      });
      break;
    }

    default: {
      break;
    }
  }
}
