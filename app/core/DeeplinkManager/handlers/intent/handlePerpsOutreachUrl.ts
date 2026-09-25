import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

/**
 * Deeplink intent for the mobile perps outreach bottom sheet.
 *
 * Supported URL:
 * - https://link.metamask.io/perps-outreach
 * - metamask://perps-outreach
 *
 * There are no query parameters. The banner served by
 * `/v1/outreach` on terminal-backend carries this URL in `banner.linkUrl` so
 * the tap can be retargeted server-side without a mobile release; today it
 * always resolves to the outreach details modal registered under
 * `Routes.PERPS.MODALS.OUTREACH_DETAILS`.
 */
export const createPerpsOutreachDeeplinkIntent = (): DeeplinkIntent => ({
  target: {
    type: 'main-stack',
    routeName: Routes.PERPS.MODALS.ROOT,
    params: {
      screen: Routes.PERPS.MODALS.OUTREACH_DETAILS,
    },
  },
});

export const handlePerpsOutreachUrl = async () => {
  DevLogger.log(
    '[handlePerpsOutreachUrl] Opening outreach details bottom sheet',
  );

  try {
    await executeDeeplinkIntent(createPerpsOutreachDeeplinkIntent());
  } catch (error) {
    DevLogger.log('Failed to handle perps outreach deeplink:', error);
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
  }
};
