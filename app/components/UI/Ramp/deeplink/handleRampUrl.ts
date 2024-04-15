import { NavigationProp, ParamListBase } from '@react-navigation/native';
import handleRedirection from './handleRedirection';
import getRedirectPathsAndParams from './utils/getRedirectPathAndParams';
import { RampType } from '../types';
import Routes from '../../../../constants/navigation/Routes';

interface RampUrlOptions {
  rampPath: string;
  rampType: RampType;
  navigation: NavigationProp<ParamListBase>;
}

export default function handleRampUrl({
  rampPath,
  rampType,
  navigation,
}: RampUrlOptions) {
  const [redirectPaths, pathParams] = getRedirectPathsAndParams(rampPath);

  if (redirectPaths.length > 0) {
    return handleRedirection(redirectPaths, pathParams, rampType, navigation);
  }

  if (pathParams) {
    // TODO(ramp): add buy intent parser
  }

  switch (rampType) {
    case RampType.BUY:
      navigation.navigate(Routes.RAMP.BUY);
      break;
    case RampType.SELL:
      navigation.navigate(Routes.RAMP.SELL);
      break;
  }
}
