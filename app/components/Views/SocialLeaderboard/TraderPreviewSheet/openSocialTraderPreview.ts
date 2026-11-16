import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  hasAcceptedSocialTerms,
  recordSocialTermsAcceptanceForExistingProfile,
} from '../terms/socialTermsAcceptance';
import ReactQueryService from '../../../../core/ReactQueryService';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { buildTraderProfileQueryKey } from '../../../../util/social/traderProfileQueries';
import { setPendingSocialPreviewTarget } from './pendingSocialPreviewTarget';
import { buildSharedPositionPreviewQuery } from './useSharedPositionPreview';

const logPrefetchError = (error: unknown) => {
  DevLogger.log('[openSocialTraderPreview] Prefetch failed:', error);
};

/**
 * Starts loading what the sheet shows before it opens. The sheet sizes itself
 * from its first layout, so content that is already there avoids a jump.
 */
const prefetchPreview = (link: SocialTraderPreviewLink) => {
  const { queryClient } = ReactQueryService;
  queryClient
    .prefetchQuery({ queryKey: buildTraderProfileQueryKey(link.traderId) })
    .catch(logPrefetchError);
  if (link.kind === 'position') {
    queryClient
      .prefetchQuery(
        buildSharedPositionPreviewQuery(link.positionId, link.traderId),
      )
      .catch(logPrefetchError);
  }
};

export type SocialTraderPreviewLink =
  | { kind: 'trader'; traderId: string }
  | { kind: 'position'; traderId: string; positionId: string };

/**
 * Entry gate for Social profile and position links. A user who has not joined
 * Social (terms not accepted on this device) lands on Home with a preview of
 * the trader, and the link is kept so onboarding can open it afterwards.
 *
 * @param navigation - Root navigation.
 * @param link - The profile or position the link points to.
 * @returns `true` when the preview opened and the caller must stop, `false`
 * when the user has joined and the caller opens the link as usual.
 */
export const openSocialTraderPreviewIfNotJoined = (
  navigation: Pick<AppNavigationProp, 'navigate'>,
  link: SocialTraderPreviewLink,
): boolean => {
  recordSocialTermsAcceptanceForExistingProfile();
  if (hasAcceptedSocialTerms()) {
    return false;
  }
  setPendingSocialPreviewTarget({ ...link, stage: 'previewing' });
  prefetchPreview(link);
  navigation.navigate(Routes.WALLET.HOME);
  navigation.navigate(Routes.SOCIAL.TRADER_PREVIEW_SHEET, {
    traderId: link.traderId,
    ...(link.kind === 'position' ? { positionId: link.positionId } : {}),
  });
  return true;
};
