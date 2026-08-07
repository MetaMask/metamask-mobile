import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';

/**
 * NFT deeplink handler
 *
 * Supported URL formats:
 * - https://link.metamask.io/nft
 * - https://metamask.io/nft (mapped via Branch)
 */
export const handleNftUrl = () => {
  DevLogger.log('[handleNftUrl] Starting NFT deeplink handling');

  try {
    NavigationService.navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
  } catch (error) {
    DevLogger.log('[handleNftUrl] Failed to handle NFT deeplink:', error);
    Logger.error(error as Error, '[handleNftUrl] Error handling NFT deeplink');

    try {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleNftUrl] Failed to navigate to fallback screen',
      );
    }
  }
};
