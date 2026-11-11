import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

/**
 * Opens support in the root modal webview. That screen is registered with
 * `presentation: 'modal'`. `isModal: false` keeps the header's top inset, so
 * the back and share buttons sit below the status bar.
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
