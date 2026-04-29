import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { AppState, AppStateStatus, Linking } from 'react-native';
import AnimatedQRScannerModal from './AnimatedQRScanner';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import { MetaMetricsEvents } from '../../../core/Analytics';
import type { JsonMap } from '../../../core/Analytics/MetaMetrics.types';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { QRHardwareScanErrorType } from '../../../core/HardwareWallet/errors';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn<{ build: typeof mockBuild }, [JsonMap]>(
  (_properties) => ({ build: mockBuild }),
);

import {
  getCapturedCallbacks,
  resetCapturedCallbacks,
} from '../../../__mocks__/react-native-vision-camera';

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    }),
  })),
}));

jest.mock('../../../core/QrKeyring/QrKeyring', () => ({
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
    getProgress: jest.fn(() => 0.5),
    isError: jest.fn(() => false),
    isSuccess: jest.fn(() => false),
    resultError: jest.fn(() => 'Mock error'),
    resultUR: jest.fn(() => ({
      type: 'crypto-hdkey',
      cbor: Buffer.from([]),
    })),
  })),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('react-native-vision-camera');

jest.mock('react-native-modal', () => {
  const { View } = jest.requireActual('react-native');
  let previousVisible: boolean | undefined;
  return jest.fn(({ children, isVisible, onModalWillShow, onModalHide }) => {
    const wasVisible = previousVisible;

    if (isVisible && wasVisible !== isVisible && onModalWillShow) {
      setImmediate(() => {
        onModalWillShow();
      });
    }
    if (!isVisible && wasVisible === true && onModalHide) {
      setImmediate(() => {
        onModalHide();
      });
    }
    previousVisible = isVisible;
    return isVisible ? <View testID="modal">{children}</View> : null;
  });
});

const mockURRegistryDecoder = URRegistryDecoder as jest.MockedClass<
  typeof URRegistryDecoder
>;

const expectCapturedCallback = <TCallback,>(
  callback: TCallback | null,
): NonNullable<TCallback> => {
  expect(callback).toEqual(expect.any(Function));
  return callback as NonNullable<TCallback>;
};

describe('AnimatedQRScannerModal - Metrics', () => {
  const mockOnScanSuccess = jest.fn();
  const mockOnScanError = jest.fn();
  const mockOnQRHardwareScanError = jest.fn();
  const mockHideModal = jest.fn();
  const mockPauseQRCode = jest.fn();

  const defaultProps = {
    visible: true,
    purpose: QrScanRequestType.PAIR,
    onScanSuccess: mockOnScanSuccess,
    onScanError: mockOnScanError,
    onQRHardwareScanError: undefined,
    hideModal: mockHideModal,
    pauseQRCode: mockPauseQRCode,
  };

  type CapturedOnCodeScanned = NonNullable<
    ReturnType<typeof getCapturedCallbacks>['onCodeScanned']
  >;
  type QRScannerCodes = Parameters<CapturedOnCodeScanned>[0];

  const mockOnCodeScanned = async (codes: QRScannerCodes) => {
    await waitFor(() => {
      const callbacks = getCapturedCallbacks();
      expect(callbacks.onCodeScanned).not.toBeNull();
    });

    const callbacks = getCapturedCallbacks();
    const onCodeScanned = expectCapturedCallback(callbacks.onCodeScanned);

    await act(async () => {
      await onCodeScanned(codes);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({});
    resetCapturedCallbacks();
    const modalMock = jest.requireMock('react-native-modal');
    modalMock.mockClear();
  });

  describe('Camera Error Metrics', () => {
    it('tracks metrics when camera error occurs', async () => {
      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onError).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      const onError = expectCapturedCallback(callbacks.onError);
      const mockError = new Error('Camera initialization failed');
      await act(async () => {
        await onError(mockError);
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Camera initialization failed',
          is_ur_format: false,
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).toHaveBeenCalledWith(
          'Camera initialization failed',
        );
      });
    });

    it('does not track metrics when error is falsy', async () => {
      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onError).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      const onError = expectCapturedCallback(callbacks.onError);
      await act(async () => {
        await onError(null as unknown as Error);
      });

      await waitFor(() => {
        expect(mockTrackEvent).not.toHaveBeenCalled();
        expect(mockCreateEventBuilder).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
      });
    });

    it('does not track metrics when error is null or undefined', async () => {
      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onError).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      const onError = expectCapturedCallback(callbacks.onError);
      await act(async () => {
        await onError(null as unknown as Error);
      });

      await waitFor(() => {
        expect(mockTrackEvent).not.toHaveBeenCalled();
        expect(mockCreateEventBuilder).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
      });
    });
  });

  describe('QR Code Scanning Metrics', () => {
    it('shows non-UR pairing error state for non-UR QR codes', async () => {
      const { getByText } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([{ value: 'https://metamask.io', type: 'qr' }]);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Scanned QR code is not in UR format',
          error_category: QRHardwareScanErrorType.NonURQrScanned,
          is_ur_format: false,
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(
          getByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.title',
          ),
        ).toBeOnTheScreen();
        expect(
          getByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.body',
          ),
        ).toBeOnTheScreen();
      });
    });

    it('shows non-UR signing error state for non-UR QR codes', async () => {
      const { getByText } = render(
        <AnimatedQRScannerModal
          {...defaultProps}
          purpose={QrScanRequestType.SIGN}
        />,
      );

      await mockOnCodeScanned([{ value: 'https://metamask.io', type: 'qr' }]);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Scanned QR code is not in UR format',
          error_category: QRHardwareScanErrorType.NonURQrScanned,
          is_ur_format: false,
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(
          getByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.sign.title',
          ),
        ).toBeOnTheScreen();
        expect(
          getByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.sign.body',
          ),
        ).toBeOnTheScreen();
      });
    });

    it('tracks metrics when UR decoder reports an error', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => true),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(() => 'Invalid UR format'),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      const { getByText } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Invalid UR format',
          error_category: QRHardwareScanErrorType.URDecodeError,
          is_ur_format: true,
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(
          getByText('hardware_wallet.qr_scan_errors.ur_decode_error.title'),
        ).toBeOnTheScreen();
        expect(
          getByText('hardware_wallet.qr_scan_errors.ur_decode_error.body'),
        ).toBeOnTheScreen();
      });
    });

    it('tracks metrics for invalid sync QR code during pairing', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 1),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => true),
        resultError: jest.fn(),
        resultUR: jest.fn(() => ({
          type: SUPPORTED_UR_TYPE.ETH_SIGNATURE, // Wrong type for pairing
          cbor: Buffer.from([]),
        })),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      const { getByText } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([
        { value: 'ur:crypto-account/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          received_ur_type: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
          error: 'Received UR type is not valid for pairing flow',
          error_category: QRHardwareScanErrorType.WrongURType,
          is_ur_format: true,
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(
          getByText('hardware_wallet.qr_scan_errors.wrong_ur_type.pair.title'),
        ).toBeOnTheScreen();
        expect(
          getByText('hardware_wallet.qr_scan_errors.wrong_ur_type.pair.body'),
        ).toBeOnTheScreen();
      });
    });

    it('tracks metrics for invalid sign QR code during signing', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 1),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => true),
        resultError: jest.fn(),
        resultUR: jest.fn(() => ({
          type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY, // Wrong type for signing
          cbor: Buffer.from([]),
        })),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      const { getByText } = render(
        <AnimatedQRScannerModal
          {...defaultProps}
          purpose={QrScanRequestType.SIGN}
        />,
      );

      await mockOnCodeScanned([
        { value: 'ur:eth-signature/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Received UR type is not valid for signing flow',
          error_category: QRHardwareScanErrorType.WrongURType,
          is_ur_format: true,
          received_ur_type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(
          getByText('hardware_wallet.qr_scan_errors.wrong_ur_type.sign.title'),
        ).toBeOnTheScreen();
        expect(
          getByText('hardware_wallet.qr_scan_errors.wrong_ur_type.sign.body'),
        ).toBeOnTheScreen();
      });
    });

    it('tracks metrics for scan exceptions using the thrown exception message', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(() => {
          throw new Error('Unexpected decoding error');
        }),
        getProgress: jest.fn(() => 0),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      const { getByText } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Unexpected decoding error',
          error_category: QRHardwareScanErrorType.ScanException,
          is_ur_format: true,
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(
          getByText('hardware_wallet.qr_scan_errors.ur_decode_error.title'),
        ).toBeOnTheScreen();
      });
    });

    it('surfaces QR hardware scan errors without waiting for analytics', async () => {
      const { withQrKeyring } = jest.requireMock(
        '../../../core/QrKeyring/QrKeyring',
      );
      withQrKeyring.mockImplementationOnce(() => new Promise(() => undefined));

      render(
        <AnimatedQRScannerModal
          {...defaultProps}
          onQRHardwareScanError={mockOnQRHardwareScanError}
        />,
      );

      await mockOnCodeScanned([{ value: 'not-a-ur', type: 'qr' }]);

      expect(mockOnQRHardwareScanError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Scanned QR code is not in UR format',
        }),
      );
    });

    it('resumes scanning after forwarding an existing inline error to an external callback', async () => {
      const validDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 1),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => true),
        resultError: jest.fn(),
        resultUR: jest.fn(() => ({
          type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
          cbor: Buffer.from([]),
        })),
      };

      mockURRegistryDecoder.mockImplementation(
        () => validDecoderInstance as unknown as URRegistryDecoder,
      );

      const { getByText, queryByText, rerender } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([{ value: 'not-a-ur', type: 'qr' }]);

      await waitFor(() => {
        expect(
          getByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.title',
          ),
        ).toBeOnTheScreen();
      });

      rerender(
        <AnimatedQRScannerModal
          {...defaultProps}
          onQRHardwareScanError={mockOnQRHardwareScanError}
        />,
      );

      await waitFor(() => {
        expect(mockOnQRHardwareScanError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Scanned QR code is not in UR format',
          }),
        );
        expect(
          queryByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.title',
          ),
        ).toBeNull();
      });

      await mockOnCodeScanned([{ value: 'ur:crypto-hdkey/1-1', type: 'qr' }]);

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith({
          type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
          cbor: Buffer.from([]),
        });
      });
    });

    it('invokes QR hardware scan error callback once for repeated error frames', async () => {
      render(
        <AnimatedQRScannerModal
          {...defaultProps}
          onQRHardwareScanError={mockOnQRHardwareScanError}
        />,
      );

      await mockOnCodeScanned([{ value: 'not-a-ur', type: 'qr' }]);

      await waitFor(() => {
        expect(mockOnQRHardwareScanError).toHaveBeenCalledTimes(1);
        expect(mockAddProperties).toHaveBeenCalledTimes(1);
      });

      await mockOnCodeScanned([{ value: 'not-a-ur', type: 'qr' }]);

      expect(mockOnQRHardwareScanError).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledTimes(1);
    });

    it('reopens the scanner when try again is pressed', async () => {
      const validDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 1),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => true),
        resultError: jest.fn(),
        resultUR: jest.fn(() => ({
          type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
          cbor: Buffer.from([]),
        })),
      };

      mockURRegistryDecoder.mockImplementation(
        () => validDecoderInstance as unknown as URRegistryDecoder,
      );

      const { getByText } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([{ value: 'not-a-ur', type: 'qr' }]);

      await waitFor(() => {
        expect(
          getByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.title',
          ),
        ).toBeOnTheScreen();
      });

      fireEvent.press(getByText('hardware_wallet.common.try_again'));

      await mockOnCodeScanned([{ value: 'ur:crypto-hdkey/1-1', type: 'qr' }]);

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith({
          type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
          cbor: Buffer.from([]),
        });
      });
    });

    it('opens support article when learn more is pressed', async () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByText } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([{ value: 'not-a-ur', type: 'qr' }]);

      fireEvent.press(getByText('hardware_wallet.common.learn_more'));

      await waitFor(() => {
        expect(openUrlSpy).toHaveBeenCalledWith(
          'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/#qr-codean-gapped-wallets',
        );
      });

      openUrlSpy.mockRestore();
    });

    it('successfully scans valid QR code without tracking error metrics', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 1),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => true),
        resultError: jest.fn(),
        resultUR: jest.fn(() => ({
          type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
          cbor: Buffer.from([]),
        })),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith({
          type: SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
          cbor: Buffer.from([]),
        });
        expect(mockTrackEvent).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
      });
    });

    it('does not process QR code when modal is not visible', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} visible={false} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockDecoderInstance.receivePart).not.toHaveBeenCalled();
        expect(mockOnScanSuccess).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });

    it('does not process QR code when codes array is empty', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([]);

      await waitFor(() => {
        expect(mockDecoderInstance.receivePart).not.toHaveBeenCalled();
        expect(mockOnScanSuccess).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });

    it('does not process QR code when code value is null or undefined', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: null as unknown as string, type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockDecoderInstance.receivePart).not.toHaveBeenCalled();
        expect(mockOnScanSuccess).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });

    it('does not process QR code when code value is empty string', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([{ value: '', type: 'qr' }]);

      await waitFor(() => {
        expect(mockDecoderInstance.receivePart).not.toHaveBeenCalled();
        expect(mockOnScanSuccess).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });
  });

  describe('Camera Permission Error', () => {
    it('re-requests camera permission when app returns to foreground', async () => {
      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;
      const mockRequestPermission = jest.fn().mockResolvedValue(false);
      mockUseCameraPermission.mockReturnValue({
        hasPermission: false,
        requestPermission: mockRequestPermission,
      });

      let appStateChangeHandler:
        | ((nextAppState: AppStateStatus) => void)
        | null = null;
      const addEventListenerSpy = jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((eventType, listener) => {
          if (eventType === 'change') {
            appStateChangeHandler = listener;
          }
          return { remove: jest.fn() };
        });

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalledTimes(1);
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(appStateChangeHandler).not.toBeNull();

      act(() => {
        appStateChangeHandler?.('background');
      });

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalledTimes(1);
      });

      act(() => {
        appStateChangeHandler?.('active');
      });

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalledTimes(2);
      });

      addEventListenerSpy.mockRestore();
    });

    it('keeps modal open with settings button when permission is denied', async () => {
      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;
      const openSettingsSpy = jest
        .spyOn(Linking, 'openSettings')
        .mockResolvedValue();

      const mockRequestPermission = jest.fn().mockResolvedValue(false);
      mockUseCameraPermission.mockReturnValue({
        hasPermission: false,
        requestPermission: mockRequestPermission,
      });

      const { getByTestId, getByText } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });

      expect(mockOnScanError).not.toHaveBeenCalled();
      expect(getByText('transaction.no_camera_permission')).toBeOnTheScreen();
      expect(getByTestId('open-settings-button')).toBeOnTheScreen();

      await act(async () => {
        getByTestId('open-settings-button').props.onPress();
      });
      expect(openSettingsSpy).toHaveBeenCalledTimes(1);

      openSettingsSpy.mockRestore();
    });

    it('does not call onScanError when requestPermission is granted', async () => {
      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;

      const mockRequestPermission = jest.fn().mockResolvedValue(true);
      mockUseCameraPermission.mockReturnValue({
        hasPermission: false,
        requestPermission: mockRequestPermission,
      });

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });

      expect(mockOnScanError).not.toHaveBeenCalled();
    });

    it('does not call onScanError when camera permission is already granted', async () => {
      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;

      mockUseCameraPermission.mockReturnValue({
        hasPermission: true,
        requestPermission: jest.fn(),
      });

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      expect(mockOnScanError).not.toHaveBeenCalled();
    });

    it('does not request permission when modal is not visible', async () => {
      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;

      const mockRequestPermission = jest.fn().mockResolvedValue(false);
      mockUseCameraPermission.mockReturnValue({
        hasPermission: false,
        requestPermission: mockRequestPermission,
      });

      const propsWithoutVisibility = { ...defaultProps, visible: false };

      render(<AnimatedQRScannerModal {...propsWithoutVisibility} />);

      await waitFor(() => {
        expect(mockOnScanError).not.toHaveBeenCalled();
      });

      expect(mockRequestPermission).not.toHaveBeenCalled();
    });
  });

  describe('Device Information in Metrics', () => {
    it('includes device name in all error metrics', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => true),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(() => 'Test error'),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            device_model: 'MockDevice',
            device_type: HardwareDeviceTypes.QR,
          }),
        );
      });
    });

    it('uses "Unknown" device name when withQrKeyring fails during camera error', async () => {
      const { withQrKeyring } = jest.requireMock(
        '../../../core/QrKeyring/QrKeyring',
      );
      withQrKeyring.mockRejectedValueOnce(new Error('Keyring not initialized'));

      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;

      mockUseCameraPermission.mockReturnValue({
        hasPermission: true,
        requestPermission: jest.fn(),
      });

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onError).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      const onError = expectCapturedCallback(callbacks.onError);
      const mockError = new Error('Camera error');
      await act(async () => {
        await onError(mockError);
      });

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Camera error',
          is_ur_format: false,
          device_model: 'Unknown',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockOnScanError).toHaveBeenCalledWith('Camera error');
      });
    });

    it('uses "Unknown" device name when withQrKeyring fails during QR scanning', async () => {
      const { withQrKeyring } = jest.requireMock(
        '../../../core/QrKeyring/QrKeyring',
      );
      withQrKeyring.mockRejectedValueOnce(new Error('Keyring not initialized'));

      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => true),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(() => 'Decoder error'),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Decoder error',
          error_category: QRHardwareScanErrorType.URDecodeError,
          is_ur_format: true,
          device_model: 'Unknown',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockOnScanError).not.toHaveBeenCalled();
      });
    });
  });

  describe('buildQrHardwareWalletErrorAnalyticsProperties', () => {
    it('includes received_ur_type when error_category is wrong_ur_type', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 1),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => true),
        resultError: jest.fn(),
        resultUR: jest.fn(() => ({
          type: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
          cbor: Buffer.from([]),
        })),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-account/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            error_category: QRHardwareScanErrorType.WrongURType,
            received_ur_type: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
          }),
        );
      });
    });

    it('omits received_ur_type when error_category is not wrong_ur_type', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => true),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(() => 'Decode failed'),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        const calls = mockAddProperties.mock.calls;
        const lastCall = calls[calls.length - 1]?.[0];
        expect(lastCall?.error_category).not.toBe(
          QRHardwareScanErrorType.WrongURType,
        );
        expect(lastCall).not.toHaveProperty('received_ur_type');
      });
    });
  });

  describe('Scan Exception Edge Cases', () => {
    it('handles non-Error thrown values in scan exception', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(() => {
          throw 'string error';
        }),
        getProgress: jest.fn(() => 0),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'string error',
            error_category: QRHardwareScanErrorType.ScanException,
            is_ur_format: true,
          }),
        );
      });
    });

    it('handles Error thrown values in scan exception', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(() => {
          throw new Error('custom error message');
        }),
        getProgress: jest.fn(() => 0),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await mockOnCodeScanned([
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'custom error message',
            error_category: QRHardwareScanErrorType.ScanException,
          }),
        );
      });
    });
  });

  describe('onModalHideComplete', () => {
    it('calls onModalHideComplete when modal is hidden', async () => {
      const mockOnModalHideComplete = jest.fn();
      const propsHidden = {
        ...defaultProps,
        visible: false,
        onModalHideComplete: mockOnModalHideComplete,
      };
      const propsVisible = {
        ...defaultProps,
        visible: true,
        onModalHideComplete: mockOnModalHideComplete,
      };

      const { rerender } = render(<AnimatedQRScannerModal {...propsVisible} />);
      expect(mockOnModalHideComplete).not.toHaveBeenCalled();

      mockPauseQRCode.mockClear();
      rerender(<AnimatedQRScannerModal {...propsHidden} />);

      await waitFor(
        () => {
          expect(mockOnModalHideComplete).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 },
      );
    });

    it('completes hide flow when onModalHideComplete is not provided', async () => {
      const propsHidden = { ...defaultProps, visible: false };
      const propsVisible = { ...defaultProps, visible: true };

      const { rerender } = render(<AnimatedQRScannerModal {...propsHidden} />);

      rerender(<AnimatedQRScannerModal {...propsVisible} />);

      await waitFor(
        () => {
          expect(mockPauseQRCode).toHaveBeenCalledWith(true);
        },
        { timeout: 2000 },
      );

      mockPauseQRCode.mockClear();
      rerender(<AnimatedQRScannerModal {...propsHidden} />);

      await waitFor(
        () => {
          expect(mockPauseQRCode).toHaveBeenCalledWith(false);
        },
        { timeout: 2000 },
      );
    });
  });

  describe('showScannerError without onQRHardwareScanError callback', () => {
    it('renders inline error UI when onQRHardwareScanError is not provided', async () => {
      const { getByText, queryByTestId } = render(
        <AnimatedQRScannerModal {...defaultProps} />,
      );

      await mockOnCodeScanned([{ value: 'not-a-ur', type: 'qr' }]);

      await waitFor(() => {
        expect(
          getByText(
            'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.title',
          ),
        ).toBeOnTheScreen();
        expect(
          queryByTestId('qr-scanner-error-learn-more-button'),
        ).toBeTruthy();
        expect(queryByTestId('qr-scanner-error-try-again-button')).toBeTruthy();
      });
    });
  });

  describe('Modal Lifecycle', () => {
    it('calls pauseQRCode with true when modal is shown', async () => {
      const propsHidden = { ...defaultProps, visible: false };
      const propsVisible = { ...defaultProps, visible: true };

      const { rerender } = render(<AnimatedQRScannerModal {...propsHidden} />);

      mockPauseQRCode.mockClear();
      rerender(<AnimatedQRScannerModal {...propsVisible} />);

      await waitFor(() => {
        expect(mockPauseQRCode).toHaveBeenCalledWith(true);
      });
    });

    it('calls pauseQRCode with false and resets state when modal is hidden', async () => {
      const propsHidden = { ...defaultProps, visible: false };
      const propsVisible = { ...defaultProps, visible: true };

      // Start with hidden modal
      const { rerender } = render(<AnimatedQRScannerModal {...propsHidden} />);

      // Show modal
      rerender(<AnimatedQRScannerModal {...propsVisible} />);

      // Wait for initial show callback
      await waitFor(
        () => {
          expect(mockPauseQRCode).toHaveBeenCalledWith(true);
        },
        { timeout: 2000 },
      );

      mockPauseQRCode.mockClear();

      // Hide modal
      rerender(<AnimatedQRScannerModal {...propsHidden} />);

      await waitFor(
        () => {
          expect(mockPauseQRCode).toHaveBeenCalledWith(false);
        },
        { timeout: 2000 },
      );
    });

    it('does not throw error when pauseQRCode is not provided', async () => {
      const propsWithoutPauseHidden = {
        ...defaultProps,
        pauseQRCode: undefined,
        visible: false,
      };
      const propsWithoutPauseVisible = {
        ...defaultProps,
        pauseQRCode: undefined,
        visible: true,
      };

      const { rerender } = render(
        <AnimatedQRScannerModal {...propsWithoutPauseHidden} />,
      );

      expect(() => {
        rerender(<AnimatedQRScannerModal {...propsWithoutPauseVisible} />);
      }).not.toThrow();

      expect(() => {
        rerender(<AnimatedQRScannerModal {...propsWithoutPauseHidden} />);
      }).not.toThrow();
    });

    it('resets progress and decoder when modal is hidden', async () => {
      const mockDecoderInstance = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };

      mockURRegistryDecoder.mockImplementation(
        () => mockDecoderInstance as unknown as URRegistryDecoder,
      );

      const propsVisible = { ...defaultProps, visible: true };
      const propsHidden = { ...defaultProps, visible: false };

      const { rerender } = render(<AnimatedQRScannerModal {...propsVisible} />);

      // Simulate scanning to set progress
      await mockOnCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);

      // Hide modal to trigger reset
      mockPauseQRCode.mockClear();
      rerender(<AnimatedQRScannerModal {...propsHidden} />);

      await waitFor(() => {
        expect(mockPauseQRCode).toHaveBeenCalledWith(false);
      });

      // When modal is shown again, it should start fresh
      mockPauseQRCode.mockClear();
      rerender(<AnimatedQRScannerModal {...propsVisible} />);

      await waitFor(() => {
        expect(mockPauseQRCode).toHaveBeenCalledWith(true);
      });
    });
  });
});
