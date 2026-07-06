import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import ReduxService from '../../../redux';
import {
  setWhatsHappeningOutdatedItemId,
  clearWhatsHappeningOutdatedItemId,
} from '../../../../reducers/whatsHappeningDeeplink';
import { EXPLORE_TAB_INDEX } from '../../../../constants/navigation/exploreTabIndices';
import { WhatsHappeningSource } from '../../../../components/UI/WhatsHappening/constants';

interface HandleWhatsHappeningUrlParams {
  /**
   * Optional market overview front-page item id. When present, the carousel
   * renders this (older) item first with an "Outdated" label.
   */
  id?: string;
}

const navigateToFallback = () => {
  NavigationService.navigation.navigate(Routes.WALLET.HOME);
};

/**
 * Whats Happening deeplink handler.
 *
 * Supported URL formats:
 * - https://link.metamask.io/whats-happening
 * - metamask://whats-happening
 * - https://link.metamask.io/whats-happening?id=<uuid>
 * - metamask://whats-happening?id=<uuid>
 *
 * Without an `id`, opens the What's Happening detail view on the first card.
 * With an `id`, stores the id in Redux so the What's Happening carousel fetches
 * that front-page item and renders it first with an "Outdated" label, then
 * opens the Explore "Now" tab where the carousel lives.
 */
export const handleWhatsHappeningUrl = ({
  id,
}: HandleWhatsHappeningUrlParams = {}) => {
  DevLogger.log('[handleWhatsHappeningUrl] Starting deeplink handling', { id });

  try {
    if (id) {
      ReduxService.store.dispatch(setWhatsHappeningOutdatedItemId(id));
      NavigationService.navigation.navigate(Routes.TRENDING_VIEW, {
        initialTab: EXPLORE_TAB_INDEX.NOW,
        source: WhatsHappeningSource.Deeplink,
      });
      return;
    }

    // No id: clear any previously deep-linked outdated item and open the
    // detail view on the first card, preserving the original behavior.
    ReduxService.store.dispatch(clearWhatsHappeningOutdatedItemId());
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
