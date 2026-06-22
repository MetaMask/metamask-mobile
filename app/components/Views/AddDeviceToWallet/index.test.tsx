import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AddDeviceToWallet from './index';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCreateQRScannerNavDetails = jest.fn(
  (params: unknown) => ['QRTabSwitcher', params] as [string, unknown],
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../QRTabSwitcher', () => ({
  QRTabSwitcherScreens: { Scanner: 0 },
  createQRScannerNavDetails: (params: unknown) =>
    mockCreateQRScannerNavDetails(params),
}));

describe('AddDeviceToWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders add device instructions and scan button', () => {
    const { getByText } = renderWithProvider(<AddDeviceToWallet />);

    expect(
      getByText(strings('app_settings.add_device.add_device_to_wallet')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('app_settings.add_device.scan_qr_code_button')),
    ).toBeOnTheScreen();
  });

  it('opens add-device QR scanner with MWP deeplink handler', () => {
    const { getByText } = renderWithProvider(<AddDeviceToWallet />);

    fireEvent.press(
      getByText(strings('app_settings.add_device.scan_qr_code_button')),
    );

    expect(mockCreateQRScannerNavDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
        onMwpDeeplinkScanned: expect.any(Function),
      }),
    );
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('navigates to verification sheet after valid MWP deeplink scan', () => {
    const { getByText } = renderWithProvider(<AddDeviceToWallet />);

    fireEvent.press(
      getByText(strings('app_settings.add_device.scan_qr_code_button')),
    );

    const scannerParams = mockCreateQRScannerNavDetails.mock.calls[0][0] as {
      onMwpDeeplinkScanned: (url: string) => void;
    };

    scannerParams.onMwpDeeplinkScanned('metamask://connect/mwp?p=abc');

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
        params: { verificationCode: '469192' },
      }),
    );
  });

  it('shows device added screen after verification completes', () => {
    const { getByText } = renderWithProvider(<AddDeviceToWallet />);

    act(() => {
      DeviceEventEmitter.emit('addDeviceVerificationDone');
    });

    expect(
      getByText(strings('app_settings.add_device.device_added')),
    ).toBeOnTheScreen();
  });
});
