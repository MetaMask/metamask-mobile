import { DeviceEventEmitter } from 'react-native';
import { strings } from '../../../locales/i18n';
import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';

export const ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT =
  'addDeviceResetToInstructions';

export const showExtensionCancelledErrorSheet = (
  navigation: AppNavigationProp,
): void => {
  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
    params: {
      type: 'error',
      title: strings('app_settings.add_device.extension_cancelled_title'),
      description: strings(
        'app_settings.add_device.extension_cancelled_description',
      ),
      descriptionAlign: 'center',
      primaryButtonLabel: strings(
        'app_settings.add_device.extension_cancelled_button',
      ),
      closeOnPrimaryButtonPress: true,
      onPrimaryButtonPress: () => {
        DeviceEventEmitter.emit(ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT);
      },
    },
  });
};
