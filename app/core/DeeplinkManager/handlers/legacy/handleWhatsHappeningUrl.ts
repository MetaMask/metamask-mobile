import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { WhatsHappeningSource } from '../../../../components/UI/WhatsHappening/constants';
import {
  getWhatsHappeningTraceId,
  getWhatsHappeningTraceTags,
} from '../../../../components/UI/WhatsHappening/utils/whatsHappeningPerformance';
import { trace, TraceName, TraceOperation } from '../../../../util/trace';

interface HandleWhatsHappeningUrlParams {
  /**
   * Optional market overview front-page item id. When present, the expanded
   * detail view renders this (older) item first with an "Outdated" label.
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
 * Opens the What's Happening expanded detail view. Without an `id` it opens on
 * the first (latest) card; with an `id` it passes that front-page item id to
 * the detail view, which fetches it and shows it first, flagged "Outdated".
 */
export const handleWhatsHappeningUrl = ({
  id,
}: HandleWhatsHappeningUrlParams = {}) => {
  DevLogger.log('[handleWhatsHappeningUrl] Starting deeplink handling', { id });

  try {
    trace({
      name: TraceName.WhatsHappeningViewLoad,
      op: TraceOperation.WhatsHappeningLoad,
      id: getWhatsHappeningTraceId(WhatsHappeningSource.Deeplink, 'expanded'),
      tags: getWhatsHappeningTraceTags(
        { source: WhatsHappeningSource.Deeplink, stage: 'expanded' },
        'cold',
      ),
    });
    NavigationService.navigation.navigate(Routes.WHATS_HAPPENING_DETAIL, {
      source: WhatsHappeningSource.Deeplink,
      initialIndex: 0,
      ...(id ? { outdatedItemId: id } : {}),
    });
  } catch (error) {
    DevLogger.log(
      '[handleWhatsHappeningUrl] Failed to handle deeplink:',
      error,
    );
    navigateToFallback();
  }
};
