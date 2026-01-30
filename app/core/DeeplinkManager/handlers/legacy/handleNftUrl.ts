import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

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
    // Navigate to the NFT full view
    NavigationService.navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
  } catch (error) {
    DevLogger.log('Failed to handle NFT deeplink:', error);
    // Fallback navigation on error
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
  }
};
