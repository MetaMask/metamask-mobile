import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { isCaipAssetType } from '@metamask/utils';
import handleRedirection from './handleRedirection';
import getRedirectPathsAndParams from './utils/getRedirectPathAndParams';
import { RampType } from '../types';
import parseRampIntent from '../utils/parseRampIntent';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../routes/utils';
import Logger from '../../../../../util/Logger';

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
  try {
    const [redirectPaths, redirectParams] = getRedirectPathsAndParams(rampPath);
    if (redirectPaths.length > 0) {
      return handleRedirection(redirectPaths, redirectParams, rampType, navigation);
    }

    const cleanPath = rampPath.startsWith('?') ? rampPath.slice(1) : rampPath;
    const urlParams = new URLSearchParams(cleanPath);

    const assetId = urlParams.get('assetId');
    const chainId = urlParams.get('chainId');
    const address = urlParams.get('address');
    const amount = urlParams.get('amount');
    const currency = urlParams.get('currency');

    if (assetId && !isCaipAssetType(assetId)) {
      Logger.error(new Error(`Invalid CAIP-19 assetId format: ${assetId}`));
    }

    if (chainId && isCaipAssetType(chainId)) {
      Logger.error(new Error(`ChainId parameter contains CAIP-19 asset identifier: ${chainId}`));
    }

    const rampPathParams: Record<string, string | undefined> = {
      assetId: assetId || undefined,
      chainId: chainId || undefined,
      address: address || undefined,
      amount: amount || undefined,
      currency: currency || undefined,
    };

    const rampIntent = parseRampIntent(rampPathParams);

    switch (rampType) {
      case RampType.BUY:
        navigation.navigate(...createBuyNavigationDetails(rampIntent));
        break;
      case RampType.SELL:
        navigation.navigate(...createSellNavigationDetails(rampIntent));
        break;
    }
  } catch (error) {
    Logger.error(
      error as Error,
      `Error in handleRampUrl. rampPath: ${rampPath}`,
    );
  }
}
