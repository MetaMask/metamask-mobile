import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { setContentPreviewToken } from '../../../../actions/notification/helpers';
import { NAVIGATION_PARAMS_DELAY_MS } from '../../../../constants/navigation/delays';

export function navigateToHomeUrl(params: { homePath?: string }) {
  const { homePath } = params;
  const urlParams = new URLSearchParams(
    homePath?.includes('?') ? homePath.split('?')[1] : '',
  );
  setContentPreviewToken(urlParams.get('previewToken'));
  const openNetworkSelectorParam = urlParams
    .get('openNetworkSelector')
    ?.toLowerCase();
  const shouldOpenNetworkSelector =
    openNetworkSelectorParam === 'true' || openNetworkSelectorParam === '1';

  NavigationService.navigation.navigate(Routes.WALLET.HOME);

  if (shouldOpenNetworkSelector) {
    setTimeout(() => {
      NavigationService.navigation.setParams({ openNetworkSelector: true });
    }, NAVIGATION_PARAMS_DELAY_MS);
  }
}
