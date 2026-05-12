import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { WhatsHappeningSource } from '../../../../components/Views/Homepage/Sections/WhatsHappening/constants';

interface HandleWhatsHappeningUrlParams {
  actionPath: string;
}

const DEFAULT_INITIAL_INDEX = 0;

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
export const handleWhatsHappeningUrl = ({
  actionPath,
}: HandleWhatsHappeningUrlParams) => {
  DevLogger.log(
    '[handleWhatsHappeningUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    DevLogger.log('[handleWhatsHappeningUrl] Parsed navigation parameters:', {
      initialIndex: DEFAULT_INITIAL_INDEX,
    });

    NavigationService.navigation.navigate(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: DEFAULT_INITIAL_INDEX,
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
