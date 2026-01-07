import Logger from '../../../../../util/Logger';
import getRedirectPathsAndParams from '../../utils/getRedirectPathAndParams';
import { createDepositNavigationDetails } from '../routes/utils';
import parseRampIntent from '../../utils/parseRampIntent';
import NavigationService from '../../../../../core/NavigationService';

interface DepositUrlOptions {
  depositPath: string;
}

export default function handleDepositUrl({ depositPath }: DepositUrlOptions) {
  try {
    const [, pathParams] = getRedirectPathsAndParams(depositPath);

    let depositIntent;
    if (pathParams) {
      depositIntent = parseRampIntent(pathParams);
    }
    NavigationService.navigation.navigate(
      ...createDepositNavigationDetails(depositIntent),
    );
  } catch (error) {
    Logger.error(
      error as Error,
      `Error in handleDepositUrl. depositPath: ${depositPath}`,
    );
  }
}
