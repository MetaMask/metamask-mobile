import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AddDeviceScannerRecovery, {
  AddDeviceScannerPermissionDenied,
} from './AddDeviceScannerRecovery';
import { AddDeviceScannerUiState } from './addDeviceScannerUtils';
import { strings } from '../../../../locales/i18n';

describe('AddDeviceScannerRecovery', () => {
  it('renders invalid QR copy and invokes try again', () => {
    const onTryAgain = jest.fn();
    const { getByText } = renderWithProvider(
      <AddDeviceScannerRecovery
        state={AddDeviceScannerUiState.InvalidQr}
        onTryAgain={onTryAgain}
      />,
    );

    expect(
      getByText(strings('app_settings.add_device.scanner.invalid_qr_title')),
    ).toBeOnTheScreen();
    fireEvent.press(
      getByText(strings('app_settings.add_device.scanner.try_again')),
    );
    expect(onTryAgain).toHaveBeenCalled();
  });

  it('renders expired QR copy', () => {
    const { getByText } = renderWithProvider(
      <AddDeviceScannerRecovery
        state={AddDeviceScannerUiState.ExpiredQr}
        onTryAgain={jest.fn()}
      />,
    );

    expect(
      getByText(strings('app_settings.add_device.scanner.expired_qr_title')),
    ).toBeOnTheScreen();
  });

  it('renders connection failed copy', () => {
    const { getByText } = renderWithProvider(
      <AddDeviceScannerRecovery
        state={AddDeviceScannerUiState.ConnectionFailed}
        onTryAgain={jest.fn()}
      />,
    );

    expect(
      getByText(
        strings('app_settings.add_device.scanner.connection_failed_title'),
      ),
    ).toBeOnTheScreen();
  });
});

describe('AddDeviceScannerPermissionDenied', () => {
  it('opens device settings when Open Settings is pressed', () => {
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);

    const { getByText } = renderWithProvider(
      <AddDeviceScannerPermissionDenied />,
    );

    fireEvent.press(
      getByText(strings('app_settings.add_device.scanner.open_settings')),
    );

    expect(openSettingsSpy).toHaveBeenCalled();
    openSettingsSpy.mockRestore();
  });
});
