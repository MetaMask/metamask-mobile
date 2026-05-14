import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { WhatsHappeningSource } from '../../../../components/UI/WhatsHappening/constants';

const navigateToFallback = () => {
  NavigationService.navigation.navigate(Routes.WALLET.HOME);
};

/**
 * Whats Happening deeplink handler.
 *
 * Supported URL formats:
 * - https://link.metamask.io/whats-happening
 * - metamask://whats-happening
 *
 * Deeplinks always open the first card.
 */
export const handleWhatsHappeningUrl = () => {
  DevLogger.log('[handleWhatsHappeningUrl] Starting deeplink handling');

  try {
    NavigationService.navigation.navigate(Routes.WHATS_HAPPENING_DETAIL, {
      source: WhatsHappeningSource.Deeplink,
    });
  } catch (error) {
    DevLogger.log(
      '[handleWhatsHappeningUrl] Failed to handle deeplink:',
      error,
    );
    navigateToFallback();
  }
};
