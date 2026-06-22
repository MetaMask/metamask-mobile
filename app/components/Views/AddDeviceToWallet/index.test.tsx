import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AddDeviceToWallet from './index';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockHandleScannedQrPayload = jest.fn();
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

jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncController: {
      handleScannedQrPayload: (...args: unknown[]) =>
        mockHandleScannedQrPayload(...args),
      cancelSession: jest.fn(),
    },
  },
}));

jest.mock('../../../selectors/qrSyncController', () => ({
  selectQrSyncPresentation: jest.fn(() => 'instructions'),
  selectQrSyncShouldShowOtpSheet: jest.fn(() => false),
  selectQrSyncIsBusy: jest.fn(() => false),
  selectQrSyncIsSessionActive: jest.fn(() => false),
  selectQrSyncError: jest.fn(() => null),
}));

describe('AddDeviceToWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleScannedQrPayload.mockResolvedValue(undefined);
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

  it('opens add-device QR scanner with onScanSuccess handler', () => {
    const { getByText } = renderWithProvider(<AddDeviceToWallet />);

    fireEvent.press(
      getByText(strings('app_settings.add_device.scan_qr_code_button')),
    );

    expect(mockCreateQRScannerNavDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
        onScanSuccess: expect.any(Function),
      }),
    );
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('submits scanned QR payload to QrSyncController', () => {
    const { getByText } = renderWithProvider(<AddDeviceToWallet />);

    fireEvent.press(
      getByText(strings('app_settings.add_device.scan_qr_code_button')),
    );

    const scannerParams = mockCreateQRScannerNavDetails.mock.calls[0][0] as {
      onScanSuccess: (data: { content?: string }, content?: string) => void;
    };

    scannerParams.onScanSuccess(
      { content: 'metamask://connect/mwp?p=abc' },
      'metamask://connect/mwp?p=abc',
    );

    expect(mockHandleScannedQrPayload).toHaveBeenCalledWith(
      'metamask://connect/mwp?p=abc',
    );
  });
});
