import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AnimatedQRScannerModal from './AnimatedQRScanner';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

import {
  getCapturedCallbacks,
  resetCapturedCallbacks,
} from '../../../__mocks__/react-native-vision-camera';

jest.mock('../../../components/hooks/useMetrics', () => {
  const actualMetrics = jest.requireActual(
    '../../../components/hooks/useMetrics',
  );
  return {
    ...actualMetrics,
    useMetrics: jest.fn(() => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
      }),
    })),
  };
});

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

describe('AnimatedQRScannerModal - Metrics', () => {
  const mockOnScanSuccess = jest.fn();
  const mockOnScanError = jest.fn();
  const mockHideModal = jest.fn();
  const mockPauseQRCode = jest.fn();

  const defaultProps = {
    visible: true,
    purpose: QrScanRequestType.PAIR,
    onScanSuccess: mockOnScanSuccess,
    onScanError: mockOnScanError,
    hideModal: mockHideModal,
    pauseQRCode: mockPauseQRCode,
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
      if (!callbacks.onError) {
        throw new Error('onError callback is null');
      }

      const onError = callbacks.onError;
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
      if (!callbacks.onError) {
        throw new Error('onError callback is null');
      }

      const onError = callbacks.onError;
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
      if (!callbacks.onError) {
        throw new Error('onError callback is null');
      }

      const onError = callbacks.onError;
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

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Invalid UR format',
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).toHaveBeenCalledWith(
          'transaction.unknown_qr_code',
        );
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

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          received_ur_type: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
          error: 'invalid `sync` qr code',
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).toHaveBeenCalledWith(
          'transaction.invalid_qr_code_sync',
        );
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

      render(
        <AnimatedQRScannerModal
          {...defaultProps}
          purpose={QrScanRequestType.SIGN}
        />,
      );

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'invalid `sign` qr code',
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).toHaveBeenCalledWith(
          'transaction.invalid_qr_code_sign',
        );
      });
    });

    it('tracks metrics for unknown QR code exception', async () => {
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

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'transaction.unknown_qr_code',
          device_model: 'MockDevice',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith({});
        expect(mockOnScanError).toHaveBeenCalledWith(
          'transaction.unknown_qr_code',
        );
      });
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

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

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

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

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

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([]);
      });

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

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: null as unknown as string, type: 'qr' }]);
      });

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

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: '', type: 'qr' }]);
      });

      await waitFor(() => {
        expect(mockDecoderInstance.receivePart).not.toHaveBeenCalled();
        expect(mockOnScanSuccess).not.toHaveBeenCalled();
        expect(mockOnScanError).not.toHaveBeenCalled();
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });
  });

  describe('Camera Permission Error', () => {
    it('calls onScanError when camera permission is not granted', async () => {
      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;

      mockUseCameraPermission.mockReturnValue({
        hasPermission: false,
        requestPermission: jest.fn(),
      });

      render(<AnimatedQRScannerModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockOnScanError).toHaveBeenCalledWith(
          'transaction.no_camera_permission',
        );
      });
    });

    it('does not call onScanError when camera permission is granted', async () => {
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

    it('does not call onScanError when modal is not visible', async () => {
      const mockUseCameraPermission = jest.requireMock(
        'react-native-vision-camera',
      ).useCameraPermission;

      mockUseCameraPermission.mockReturnValue({
        hasPermission: false,
        requestPermission: jest.fn(),
      });

      const propsWithoutVisibility = { ...defaultProps, visible: false };

      render(<AnimatedQRScannerModal {...propsWithoutVisibility} />);

      await waitFor(() => {
        expect(mockOnScanError).not.toHaveBeenCalled();
      });
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

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

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
      if (!callbacks.onError) {
        throw new Error('onError callback is null');
      }

      const onError = callbacks.onError;
      const mockError = new Error('Camera error');
      await act(async () => {
        await onError(mockError);
      });

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Camera error',
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

      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          error: 'Decoder error',
          device_model: 'Unknown',
          device_type: HardwareDeviceTypes.QR,
        });
        expect(mockOnScanError).toHaveBeenCalledWith(
          'transaction.unknown_qr_code',
        );
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
      await waitFor(() => {
        const callbacks = getCapturedCallbacks();
        expect(callbacks.onCodeScanned).not.toBeNull();
      });

      const callbacks = getCapturedCallbacks();
      if (!callbacks.onCodeScanned) {
        throw new Error('onCodeScanned callback is null');
      }

      const onCodeScanned = callbacks.onCodeScanned;
      await act(async () => {
        await onCodeScanned([{ value: 'mock-qr-data', type: 'qr' }]);
      });

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
