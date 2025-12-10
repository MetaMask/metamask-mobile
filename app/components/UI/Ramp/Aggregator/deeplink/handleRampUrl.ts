import handleRedirection from './handleRedirection';
import getRedirectPathsAndParams from '../../utils/getRedirectPathAndParams';
import { RampType } from '../types';
import parseRampIntent from '../../utils/parseRampIntent';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../routes/utils';
import Logger from '../../../../../util/Logger';
import NavigationService from '../../../../../core/NavigationService';

interface RampUrlOptions {
  rampPath: string;
  rampType: RampType;
}

export default function handleRampUrl({ rampPath, rampType }: RampUrlOptions) {
  try {
    const [redirectPaths, pathParams] = getRedirectPathsAndParams(rampPath);

    if (redirectPaths.length > 0) {
      return handleRedirection(redirectPaths, pathParams, rampType);
    }

    let rampIntent;
    if (pathParams) {
      rampIntent = parseRampIntent(pathParams);
    }

    switch (rampType) {
      case RampType.BUY:
        NavigationService.navigation.navigate(
          ...createBuyNavigationDetails(rampIntent),
        );
        break;
      case RampType.SELL:
        NavigationService.navigation.navigate(
          ...createSellNavigationDetails(rampIntent),
        );
        break;
    }
  } catch (error) {
    Logger.error(
      error as Error,
      `Error in handleRampUrl. rampPath: ${rampPath}`,
    );
  }
}
