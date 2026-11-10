import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

/**
 * Opens support in the root modal webview. That navigator is a full-bleed
 * transparent modal, so the header keeps the status-bar inset and the back
 * and share buttons stay below it.
 */
export const openContactSupportWebview = (
  navigation: AppNavigationProp,
  url: string,
): void => {
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.WEBVIEW.SIMPLE,
    params: {
      url,
      title: strings('app_settings.contact_support'),
      isModal: false,
    },
  });
};
