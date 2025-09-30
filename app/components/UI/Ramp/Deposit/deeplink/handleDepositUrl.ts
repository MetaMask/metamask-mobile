import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Logger from '../../../../../util/Logger';
import getRedirectPathsAndParams from '../../utils/getRedirectPathAndParams';
import { createDepositNavigationDetails } from '../routes/utils';
import parseDepositParams from './utils/parseDepositParams';

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

    let depositParams;
    if (pathParams) {
      depositParams = parseDepositParams(pathParams);
    }
    navigation.navigate(...createDepositNavigationDetails(depositParams));
  } catch (error) {
    Logger.error(
      error as Error,
      `Error in handleDepositUrl. depositPath: ${depositPath}`,
    );
  }
}
