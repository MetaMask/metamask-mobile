import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { setContentPreviewToken } from '../../../../actions/notification/helpers';
import { PERFORMANCE_CONFIG } from '../../../../components/UI/Perps/constants/perpsConfig';

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
