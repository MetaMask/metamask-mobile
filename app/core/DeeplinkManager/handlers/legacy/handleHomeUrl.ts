import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { setContentPreviewToken } from '../../../../actions/notification/helpers';

export function navigateToHomeUrl(params: { homePath?: string }) {
  const { homePath } = params;
  const urlParams = new URLSearchParams(
    homePath?.includes('?') ? homePath.split('?')[1] : '',
  );
  setContentPreviewToken(urlParams.get('previewToken'));
  NavigationService.navigation.navigate(Routes.WALLET.HOME);
}
