import { strings } from '../../../locales/i18n';
import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';

/**
 * Shows the shared SuccessErrorSheet when existing-user QR sync import fails.
 */
export const showImportFailedSheet = (navigation: AppNavigationProp): void => {
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
    params: {
      type: 'error',
      title: strings('app_settings.add_device.import_failed_title'),
      description: strings('app_settings.add_device.import_failed_description'),
      descriptionAlign: 'center',
      primaryButtonLabel: strings(
        'app_settings.add_device.import_failed_button',
      ),
      closeOnPrimaryButtonPress: true,
    },
  });
};
