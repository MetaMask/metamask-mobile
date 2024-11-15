import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RampType } from '../types';
import Routes from '../../../../constants/navigation/Routes';

const RAMP_ACTIVITY = 'activity';

export default function handleRedirection(
  paths: string[],
  _pathParams: Record<string, string> | undefined,
  _rampType: RampType,
  navigation: NavigationProp<ParamListBase>,
) {
  switch (paths[0]) {
    case RAMP_ACTIVITY: {
      navigation.navigate(Routes.TRANSACTIONS_VIEW, {
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
