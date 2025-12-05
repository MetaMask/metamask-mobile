import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Logger from '../../../../../util/Logger';
import getRedirectPathsAndParams from '../../utils/getRedirectPathAndParams';
import { createDepositNavigationDetails } from '../routes/utils';
import parseRampIntent from '../../utils/parseRampIntent';

interface DepositUrlOptions {
  depositPath: string;
  navigation: NavigationProp<ParamListBase>;
}

export default function handleDepositUrl({
  depositPath,
  navigation,
}: DepositUrlOptions) {
  try {
    const [, pathParams] = getRedirectPathsAndParams(depositPath);

    let depositIntent;
    if (pathParams) {
      depositIntent = parseRampIntent(pathParams);
    }
    navigation.navigate(...createDepositNavigationDetails(depositIntent));
  } catch (error) {
    Logger.error(
      error as Error,
      `Error in handleDepositUrl. depositPath: ${depositPath}`,
    );
  }
}
