import { DeviceEventEmitter } from 'react-native';
import { strings } from '../../../locales/i18n';
import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../NavigationService/types';
import {
  ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT,
  showExtensionCancelledErrorSheet,
} from './showExtensionCancelledErrorSheet';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as AppNavigationProp;

describe('showExtensionCancelledErrorSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the shared success/error sheet with extension-cancel copy', () => {
    showExtensionCancelledErrorSheet(mockNavigation);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: expect.objectContaining({
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
        onClose: expect.any(Function),
        onPrimaryButtonPress: expect.any(Function),
      }),
    });
  });

  it('uses the controller error message when provided', () => {
    const errorMessage =
      'QR sync payload must include a primary mnemonic when onboarding is not completed.';

    showExtensionCancelledErrorSheet(mockNavigation, { errorMessage });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: expect.objectContaining({
        description: errorMessage,
      }),
    });
  });

  it('returns to the instructions screen when try again is pressed', () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

    showExtensionCancelledErrorSheet(mockNavigation);

    const { params } = mockNavigate.mock.calls[0][1] as {
      params: { onPrimaryButtonPress?: () => void };
    };

    params.onPrimaryButtonPress?.();

    expect(emitSpy).toHaveBeenCalledWith(
      ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT,
    );

    emitSpy.mockRestore();
  });

  it('resets to instructions when the sheet is dismissed without try again', () => {
    const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

    showExtensionCancelledErrorSheet(mockNavigation);

    const { params } = mockNavigate.mock.calls[0][1] as {
      params: { onClose?: () => void; onPrimaryButtonPress?: () => void };
    };

    params.onClose?.();

    expect(emitSpy).toHaveBeenCalledWith(
      ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT,
    );

    // Primary press after close must not double-emit.
    params.onPrimaryButtonPress?.();
    expect(emitSpy).toHaveBeenCalledTimes(1);

    emitSpy.mockRestore();
  });
});
