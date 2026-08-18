import { DeviceEventEmitter } from 'react-native';
import { strings } from '../../../locales/i18n';
import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';

export const ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT =
  'addDeviceResetToInstructions';

export interface ShowExtensionCancelledErrorSheetOptions {
  /** Controller failure detail; falls back to generic cancel copy when omitted. */
  errorMessage?: string | null;
}

export const showExtensionCancelledErrorSheet = (
  navigation: AppNavigationProp,
  options: ShowExtensionCancelledErrorSheetOptions = {},
): void => {
  let hasEmittedReset = false;

  const emitResetToInstructions = () => {
    if (hasEmittedReset) {
      return;
    }

    hasEmittedReset = true;
    DeviceEventEmitter.emit(ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT);
  };

  const description =
    options.errorMessage?.trim() ||
    strings('app_settings.add_device.extension_cancelled_description');

  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
    params: {
      type: 'error',
      title: strings('app_settings.add_device.extension_cancelled_title'),
      description,
      descriptionAlign: 'center',
      primaryButtonLabel: strings(
        'app_settings.add_device.extension_cancelled_button',
      ),
      closeOnPrimaryButtonPress: true,
      onClose: emitResetToInstructions,
      onPrimaryButtonPress: emitResetToInstructions,
    },
  });
};
