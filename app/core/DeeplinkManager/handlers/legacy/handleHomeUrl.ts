import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { setContentPreviewToken } from '../../../../actions/notification/helpers';
import { PERFORMANCE_CONFIG } from '../../../../components/UI/Perps/constants/perpsConfig';

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
    }, PERFORMANCE_CONFIG.NavigationParamsDelayMs);
  }
}
