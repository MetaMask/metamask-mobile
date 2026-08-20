import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { setContentPreviewToken } from '../../../../actions/notification/helpers';
import { PERFORMANCE_CONFIG } from '@metamask/perps-controller';
import { resolveDeeplinkNavigatedTarget } from '../../../Performance/DeeplinkPerformance';

export function navigateToHomeUrl(params: { homePath?: string }) {
  const { homePath } = params;

  // Preview Content Token
  const urlParams = new URLSearchParams(
    homePath?.includes('?') ? homePath.split('?')[1] : '',
  );
  setContentPreviewToken(urlParams.get('previewToken'));

  // Open Network Selector Deeplink
  const openNetworkSelectorParam = urlParams
    .get('openNetworkSelector')
    ?.toLowerCase();
  const shouldOpenNetworkSelector = openNetworkSelectorParam === 'true';

  // Legacy handler with no intent, so declare the target here: `home` is
  // often opened while Home is already focused, which commits no navigation
  // state change — the Navigated span can then only be closed by the
  // already-focused settle, and that requires a known target.
  resolveDeeplinkNavigatedTarget({ targetRoute: Routes.WALLET.HOME });
  NavigationService.navigation.navigate(Routes.WALLET.HOME);

  if (shouldOpenNetworkSelector) {
    // The timeout is REQUIRED - React Navigation needs time to:
    // 1. Complete the navigation transition
    // 2. Mount the Wallet component
    // 3. Make navigation context available for setParams
    // Without this delay, deeplink param effects may fail
    setTimeout(() => {
      NavigationService.navigation.setParams({ openNetworkSelector: true });
    }, PERFORMANCE_CONFIG.NavigationParamsDelayMs);
  }
}
