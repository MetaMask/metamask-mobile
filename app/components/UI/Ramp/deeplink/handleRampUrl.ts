import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RampType } from '../types';
import Routes from '../../../../constants/navigation/Routes';

interface RampUrlOptions {
  rampPath: string;
  rampType: RampType;
  navigation: NavigationProp<ParamListBase>;
}

export default function handleRampUrl({
  rampPath: _rampPath,
  rampType,
  navigation,
}: RampUrlOptions) {
  switch (rampType) {
    case RampType.BUY:
      navigation.navigate(Routes.RAMP.BUY);
      break;
    case RampType.SELL:
      navigation.navigate(Routes.RAMP.SELL);
      break;
  }
}
