import { strings } from '../../../locales/i18n';
import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';

/**
 * Shows the shared SuccessErrorSheet when QR sync finds accounts already on device.
 */
export const showAlreadySyncedSheet = (navigation: AppNavigationProp): void => {
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
    params: {
      type: 'success',
      title: strings('app_settings.add_device.already_synced_title'),
      description: strings(
        'app_settings.add_device.already_synced_description',
      ),
      descriptionAlign: 'center',
      primaryButtonLabel: strings(
        'app_settings.add_device.already_synced_button',
      ),
      closeOnPrimaryButtonPress: true,
    },
  });
};
