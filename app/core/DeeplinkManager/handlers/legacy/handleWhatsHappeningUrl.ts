import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import {
  MAX_ITEMS_DISPLAYED,
  WhatsHappeningSource,
} from '../../../../components/Views/Homepage/Sections/WhatsHappening/constants';

interface HandleWhatsHappeningUrlParams {
  actionPath: string;
}

interface WhatsHappeningNavigationParams {
  initialIndex: number;
}

const DEFAULT_INITIAL_INDEX = 0;

const parseInitialIndex = (rawIndex: string | null): number => {
  if (!rawIndex?.trim()) {
    return DEFAULT_INITIAL_INDEX;
  }

  const initialIndex = Number(rawIndex);

  if (
    !Number.isInteger(initialIndex) ||
    initialIndex < 0 ||
    initialIndex >= MAX_ITEMS_DISPLAYED
  ) {
    return DEFAULT_INITIAL_INDEX;
  }

  return initialIndex;
};

const parseWhatsHappeningNavigationParams = (
  actionPath: string,
): WhatsHappeningNavigationParams => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return {
    initialIndex: parseInitialIndex(urlParams.get('index')),
  };
};

const navigateToFallback = () => {
  NavigationService.navigation.navigate(Routes.WALLET.HOME);
};

/**
 * Whats Happening deeplink handler.
 *
 * Supported URL formats:
 * - https://link.metamask.io/whats-happening
 * - https://link.metamask.io/whats-happening?index=2
 * - metamask://whats-happening
 * - metamask://whats-happening?index=2
 *
 * The index parameter is zero-based and defaults to 0 when missing or invalid.
 */
export const handleWhatsHappeningUrl = ({
  actionPath,
}: HandleWhatsHappeningUrlParams) => {
  DevLogger.log(
    '[handleWhatsHappeningUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const navParams = parseWhatsHappeningNavigationParams(actionPath);
    DevLogger.log(
      '[handleWhatsHappeningUrl] Parsed navigation parameters:',
      navParams,
    );

    NavigationService.navigation.navigate(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: navParams.initialIndex,
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
