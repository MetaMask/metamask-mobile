import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({ build: jest.fn() }),
    }),
  })),
}));

jest.mock('../../../../core/QrKeyring/QrKeyring', () => ({
  withQrKeyring: jest.fn(async (callback) =>
    callback({
      keyring: { getName: jest.fn().mockResolvedValue('MockDevice') },
      metadata: { id: 'mock-id' },
    }),
  ),
}));

jest.mock('@keystonehq/ur-decoder', () => ({
  URRegistryDecoder: jest.fn().mockImplementation(() => ({
    receivePart: jest.fn(),
    getProgress: jest.fn(() => 1),
    isError: jest.fn(() => false),
    isSuccess: jest.fn(() => true),
    resultError: jest.fn(),
    resultUR: jest.fn(() => ({
      type: 'eth-signature',
      cbor: Buffer.from([]),
    })),
  })),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}:${JSON.stringify(params)}`;
    }
    return key;
  }),
}));

jest.mock('react-native-vision-camera');

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseRoute = jest.fn();
const mockResolvePendingScan = jest.fn();
const mockRejectPendingScan = jest.fn();
const mockUseAnimatedQrScanner = jest.fn();
const mockReset = jest.fn();
const mockOnError = jest.fn();
let capturedOnScanSuccess:
  | ((ur: { type: string; cbor: Buffer }) => void)
  | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  })),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../../core/Engine', () => ({
  getQrKeyringScanner: jest.fn(() => ({
    resolvePendingScan: mockResolvePendingScan,
    rejectPendingScan: mockRejectPendingScan,
  })),
}));

jest.mock('../../QRHardware/useAnimatedQrScanner', () => ({
  useAnimatedQrScanner: (options: unknown) => mockUseAnimatedQrScanner(options),
}));

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(() => ({
    walletType: 'qr',
    qr: {
      pendingScanRequest: {
        type: 'sign',
        request: {
          requestId: 'test-request-id',
          payload: { type: 'eth-sign-request', cbor: 'aabbccdd' },
        },
      },
      isSigningQRObject: true,
      cancelQRScanRequestIfPresent: jest.fn(),
      setRequestCompleted: jest.fn(),
      isRequestCompleted: false,
    },
  })),
}));

jest.mock('@keystonehq/bc-ur-registry-eth', () => ({
  ETHSignature: {
    fromCBOR: jest.fn(() => ({
      getRequestId: jest.fn(() => Buffer.from('test-request-id')),
    })),
  },
}));

jest.mock('uuid', () => ({
  stringify: jest.fn(() => 'test-request-id'),
}));

import { HwQrScanner } from './HwQrScanner';
import { HwQrScannerSelectorsIDs } from './HwQrScanner.testIds';
import { useHardwareWallet } from '../../../../core/HardwareWallet';

const mockUseHardwareWallet = useHardwareWallet as jest.Mock;

const mockScannerResult = {
  cameraDevice: { id: 'mock-camera' },
  hasPermission: true,
  codeScanner: { codeTypes: ['qr'], onCodeScanned: jest.fn() },
  progress: 0,
  scanError: null,
  errorTitle: null,
  reset: mockReset,
  onError: mockOnError,
};

describe('HwQrScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnScanSuccess = undefined;
    jest.requireMock('uuid').stringify.mockReturnValue('test-request-id');
    jest
      .requireMock('@keystonehq/bc-ur-registry-eth')
      .ETHSignature.fromCBOR.mockReturnValue({
        getRequestId: jest.fn(() => Buffer.from('test-request-id')),
      });
    mockUseRoute.mockReturnValue({ params: { currentStep: 1, totalSteps: 2 } });
    mockUseAnimatedQrScanner.mockImplementation(
      (options: { onScanSuccess: typeof capturedOnScanSuccess }) => {
        capturedOnScanSuccess = options.onScanSuccess;
        return mockScannerResult;
      },
    );
    mockUseHardwareWallet.mockReturnValue({
      walletType: 'qr',
      qr: {
        pendingScanRequest: {
          type: 'sign',
          request: {
            requestId: 'test-request-id',
            payload: { type: 'eth-sign-request', cbor: 'aabbccdd' },
          },
        },
        isSigningQRObject: true,
        cancelQRScanRequestIfPresent: jest.fn(),
        setRequestCompleted: jest.fn(),
        isRequestCompleted: false,
      },
    });
  });

  describe('step text', () => {
    it('renders step text for intermediate step', () => {
      mockUseRoute.mockReturnValue({
        params: { currentStep: 2, totalSteps: 4 },
      });

      const { getByText } = render(<HwQrScanner />);

      expect(
        getByText(
          'bridge.hardware_wallet_progress.scanner_step_text:{"current":2,"total":4}',
        ),
      ).toBeOnTheScreen();
    });

    it('renders last step text when currentStep equals totalSteps', () => {
      mockUseRoute.mockReturnValue({
        params: { currentStep: 4, totalSteps: 4 },
      });

      const { getByText } = render(<HwQrScanner />);

      expect(
        getByText('bridge.hardware_wallet_progress.scanner_last_step_text'),
      ).toBeOnTheScreen();
    });

    it('renders last step text for single step flow', () => {
      mockUseRoute.mockReturnValue({
        params: { currentStep: 1, totalSteps: 1 },
      });

      const { getByText } = render(<HwQrScanner />);

      expect(
        getByText('bridge.hardware_wallet_progress.scanner_last_step_text'),
      ).toBeOnTheScreen();
    });

    it('uses single-step defaults when route params are missing', () => {
      mockUseRoute.mockReturnValue({});

      const { getByText } = render(<HwQrScanner />);

      expect(
        getByText('bridge.hardware_wallet_progress.scanner_last_step_text'),
      ).toBeOnTheScreen();
    });
  });

  describe('cancel', () => {
    it('rejects pending scan and navigates back on cancel press', () => {
      const { getByTestId } = render(<HwQrScanner />);

      fireEvent.press(getByTestId(HwQrScannerSelectorsIDs.CANCEL_BUTTON));

      expect(mockRejectPendingScan).toHaveBeenCalledTimes(1);
      expect(mockRejectPendingScan).toHaveBeenCalledWith(expect.any(Error));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('camera content', () => {
    it('renders camera content and scan progress', () => {
      mockUseAnimatedQrScanner.mockReturnValue({
        ...mockScannerResult,
        progress: 42,
      });

      const { getByTestId, getByText } = render(<HwQrScanner />);

      expect(getByTestId('camera-mock')).toBeOnTheScreen();
      expect(getByText('qr_scanner.scanning 42%')).toBeOnTheScreen();
    });

    it('renders scanner error title, message, and actions', () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue();
      mockUseAnimatedQrScanner.mockReturnValue({
        ...mockScannerResult,
        scanError: { userMessage: 'Try scanning a Keystone signature QR.' },
        errorTitle: 'Wrong QR code',
      });

      const { getByText, getByTestId } = render(<HwQrScanner />);

      expect(getByText('Wrong QR code')).toBeOnTheScreen();
      expect(
        getByText('Try scanning a Keystone signature QR.'),
      ).toBeOnTheScreen();

      fireEvent.press(getByTestId('hw-qr-scanner-learn-more-button'));
      fireEvent.press(getByTestId('hw-qr-scanner-try-again-button'));

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/#qr-codean-gapped-wallets',
      );
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('renders scanner error actions without optional title or message', () => {
      mockUseAnimatedQrScanner.mockReturnValue({
        ...mockScannerResult,
        scanError: {},
        errorTitle: null,
      });

      const { getByTestId, queryByText } = render(<HwQrScanner />);

      expect(getByTestId('hw-qr-scanner-try-again-button')).toBeOnTheScreen();
      expect(queryByText('Wrong QR code')).toBeNull();
    });

    it('renders camera permission state when no camera device is available', () => {
      jest.spyOn(Linking, 'openSettings').mockResolvedValue();
      mockUseAnimatedQrScanner.mockReturnValue({
        ...mockScannerResult,
        cameraDevice: undefined,
        hasPermission: true,
      });

      const { getByText, getByTestId } = render(<HwQrScanner />);

      expect(getByText('transaction.no_camera_permission')).toBeOnTheScreen();

      fireEvent.press(getByTestId('hw-qr-scanner-open-settings-button'));

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    it('renders camera permission state when camera permission is denied', () => {
      mockUseAnimatedQrScanner.mockReturnValue({
        ...mockScannerResult,
        cameraDevice: { id: 'mock-camera' },
        hasPermission: false,
      });

      const { getByText } = render(<HwQrScanner />);

      expect(getByText('transaction.no_camera_permission')).toBeOnTheScreen();
    });
  });

  describe('scan success', () => {
    it('resolves pending scan and navigates back for matching request IDs', () => {
      render(<HwQrScanner />);

      capturedOnScanSuccess?.({
        type: 'eth-signature',
        cbor: Buffer.from('signature'),
      });

      expect(
        jest.requireMock('@keystonehq/bc-ur-registry-eth').ETHSignature
          .fromCBOR,
      ).toHaveBeenCalledWith(Buffer.from('signature'));
      expect(mockResolvePendingScan).toHaveBeenCalledWith({
        type: 'eth-signature',
        cbor: Buffer.from('signature').toString('hex'),
      });
      expect(mockRejectPendingScan).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('rejects pending scan when request IDs do not match', () => {
      jest
        .requireMock('uuid')
        .stringify.mockReturnValue('different-request-id');
      render(<HwQrScanner />);

      capturedOnScanSuccess?.({
        type: 'eth-signature',
        cbor: Buffer.from('signature'),
      });

      expect(mockResolvePendingScan).not.toHaveBeenCalled();
      expect(mockRejectPendingScan).toHaveBeenCalledWith(expect.any(Error));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('rejects pending scan when a signature has no request ID', () => {
      jest
        .requireMock('@keystonehq/bc-ur-registry-eth')
        .ETHSignature.fromCBOR.mockReturnValue({
          getRequestId: jest.fn(() => undefined),
        });

      render(<HwQrScanner />);

      capturedOnScanSuccess?.({
        type: 'eth-signature',
        cbor: Buffer.from('signature'),
      });

      expect(mockResolvePendingScan).not.toHaveBeenCalled();
      expect(mockRejectPendingScan).toHaveBeenCalledWith(expect.any(Error));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('rejects pending scan when pending request is missing', () => {
      mockUseHardwareWallet.mockReturnValue({
        walletType: 'qr',
        qr: {
          pendingScanRequest: undefined,
          isSigningQRObject: true,
          cancelQRScanRequestIfPresent: jest.fn(),
          setRequestCompleted: jest.fn(),
          isRequestCompleted: false,
        },
      });

      render(<HwQrScanner />);

      capturedOnScanSuccess?.({
        type: 'eth-signature',
        cbor: Buffer.from('signature'),
      });

      expect(mockResolvePendingScan).not.toHaveBeenCalled();
      expect(mockRejectPendingScan).toHaveBeenCalledWith(expect.any(Error));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('renders scanner container', () => {
    const { getByTestId } = render(<HwQrScanner />);
    expect(getByTestId(HwQrScannerSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });
});
