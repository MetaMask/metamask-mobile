import { renderHook, act, waitFor } from '@testing-library/react-native';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { MetaMetricsEvents } from '../../../core/Analytics';
import type { JsonMap } from '../../../core/Analytics/MetaMetrics.types';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { QRHardwareScanErrorType } from '../../../core/HardwareWallet/errors';

import {
  getCapturedCallbacks,
  resetCapturedCallbacks,
} from '../../../__mocks__/react-native-vision-camera';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn<{ build: typeof mockBuild }, [JsonMap]>(
  (_properties) => ({ build: mockBuild }),
);

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

jest.mock('react-native-vision-camera');

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockURRegistryDecoder = URRegistryDecoder as jest.MockedClass<
  typeof URRegistryDecoder
>;

import { useAnimatedQrScanner } from './useAnimatedQrScanner';

type CapturedOnCodeScanned = NonNullable<
  ReturnType<typeof getCapturedCallbacks>['onCodeScanned']
>;
type QRScannerCodes = Parameters<CapturedOnCodeScanned>[0];

const expectCapturedCallback = <TCallback>(
  callback: TCallback | null,
): NonNullable<TCallback> => {
  expect(callback).toEqual(expect.any(Function));
  return callback as NonNullable<TCallback>;
};

function setupSuccessfulDecoder(urType = SUPPORTED_UR_TYPE.CRYPTO_HDKEY) {
  const instance = {
    receivePart: jest.fn(),
    getProgress: jest.fn(() => 1),
    isError: jest.fn(() => false),
    isSuccess: jest.fn(() => true),
    resultError: jest.fn(),
    resultUR: jest.fn(() => ({
      type: urType,
      cbor: Buffer.from([]),
    })),
  };
  mockURRegistryDecoder.mockImplementation(
    () => instance as unknown as URRegistryDecoder,
  );
  return instance;
}

describe('useAnimatedQrScanner', () => {
  const mockOnScanSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({});
    resetCapturedCallbacks();
  });

  const renderScannerHook = (
    overrides: {
      isActive?: boolean;
      purpose?: QrScanRequestType;
    } = {},
  ) => {
    const { isActive = true, purpose = QrScanRequestType.PAIR } = overrides;

    const hookResult = renderHook(
      ({ isActive: active, purpose: purp }) =>
        useAnimatedQrScanner({
          isActive: active,
          purpose: purp,
          onScanSuccess: mockOnScanSuccess,
        }),
      {
        initialProps: { isActive, purpose },
      },
    );

    return hookResult;
  };

  const mockOnCodeScanned = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: { current: any },
    codes: QRScannerCodes,
  ) => {
    await act(async () => {
      await result.current.codeScanner.onCodeScanned(codes);
    });
  };

  describe('initial state', () => {
    it('returns camera device and permission', () => {
      const { result } = renderScannerHook();

      expect(result.current.cameraDevice).toBeDefined();
      expect(result.current.hasPermission).toBe(true);
    });

    it('returns codeScanner', () => {
      const { result } = renderScannerHook();

      expect(result.current.codeScanner).toBeDefined();
      expect(result.current.codeScanner.codeTypes).toEqual(['qr']);
    });

    it('returns zero initial progress', () => {
      const { result } = renderScannerHook();

      expect(result.current.progress).toBe(0);
    });

    it('returns null scanError initially', () => {
      const { result } = renderScannerHook();

      expect(result.current.scanError).toBeNull();
    });
  });

  describe('scan success', () => {
    it('calls onScanSuccess with UR when valid UR type is decoded', async () => {
      const decoder = setupSuccessfulDecoder(SUPPORTED_UR_TYPE.CRYPTO_HDKEY);
      const { result } = renderScannerHook({ purpose: QrScanRequestType.PAIR });

      await mockOnCodeScanned(result, [
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(decoder.receivePart).toHaveBeenCalledWith(
          'ur:crypto-hdkey/mock-part',
        );
        expect(mockOnScanSuccess).toHaveBeenCalledTimes(1);
        const ur = mockOnScanSuccess.mock.calls[0][0];
        expect(ur.type).toBe(SUPPORTED_UR_TYPE.CRYPTO_HDKEY);
      });
    });

    it('resolves ETH_SIGNATURE for SIGN purpose', async () => {
      setupSuccessfulDecoder(SUPPORTED_UR_TYPE.ETH_SIGNATURE);
      const { result } = renderScannerHook({ purpose: QrScanRequestType.SIGN });

      await mockOnCodeScanned(result, [
        { value: 'ur:eth-signature/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledTimes(1);
        const ur = mockOnScanSuccess.mock.calls[0][0];
        expect(ur.type).toBe(SUPPORTED_UR_TYPE.ETH_SIGNATURE);
      });
    });

    it('resets progress after successful scan', async () => {
      setupSuccessfulDecoder(SUPPORTED_UR_TYPE.CRYPTO_HDKEY);
      const { result } = renderScannerHook();

      await mockOnCodeScanned(result, [
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(result.current.progress).toBe(0);
      });
    });
  });

  describe('scan errors', () => {
    it('sets scanError when non-UR QR code is scanned', async () => {
      const { result } = renderScannerHook();

      await mockOnCodeScanned(result, [
        { value: 'https://metamask.io', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(result.current.scanError).not.toBeNull();
        expect(result.current.scanError?.metadata.qrHardwareScanErrorType).toBe(
          QRHardwareScanErrorType.NonURQrScanned,
        );
      });
    });

    it('sets scanError when wrong UR type is decoded', async () => {
      setupSuccessfulDecoder('unexpected-type');
      const { result } = renderScannerHook({ purpose: QrScanRequestType.PAIR });

      await mockOnCodeScanned(result, [
        { value: 'ur:unexpected-type/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(result.current.scanError).not.toBeNull();
        expect(result.current.scanError?.metadata.qrHardwareScanErrorType).toBe(
          QRHardwareScanErrorType.WrongURType,
        );
      });
    });

    it('sets scanError when UR decoder reports an error', async () => {
      const decoder = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.5),
        isError: jest.fn(() => true),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(() => 'Invalid UR format'),
        resultUR: jest.fn(),
      };
      mockURRegistryDecoder.mockImplementation(
        () => decoder as unknown as URRegistryDecoder,
      );

      const { result } = renderScannerHook();

      await mockOnCodeScanned(result, [
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(result.current.scanError).not.toBeNull();
        expect(result.current.scanError?.metadata.qrHardwareScanErrorType).toBe(
          QRHardwareScanErrorType.URDecodeError,
        );
      });
    });

    it('returns errorTitle when scanError is present', async () => {
      const { result } = renderScannerHook();

      await mockOnCodeScanned(result, [{ value: 'not-a-ur', type: 'qr' }]);

      await waitFor(() => {
        expect(result.current.errorTitle).not.toBeNull();
      });
    });

    it('returns null errorTitle when no scanError', () => {
      const { result } = renderScannerHook();

      expect(result.current.errorTitle).toBeNull();
    });
  });

  describe('progress', () => {
    it('updates progress during scanning', async () => {
      const decoder = {
        receivePart: jest.fn(),
        getProgress: jest.fn(() => 0.75),
        isError: jest.fn(() => false),
        isSuccess: jest.fn(() => false),
        resultError: jest.fn(),
        resultUR: jest.fn(),
      };
      mockURRegistryDecoder.mockImplementation(
        () => decoder as unknown as URRegistryDecoder,
      );

      const { result } = renderScannerHook();

      await mockOnCodeScanned(result, [
        { value: 'ur:crypto-hdkey/part-1', type: 'qr' },
      ]);

      await waitFor(() => {
        expect(result.current.progress).toBe(75);
      });
    });
  });

  describe('reset', () => {
    it('clears scanError and resets decoder on reset()', async () => {
      const { result } = renderScannerHook();

      await mockOnCodeScanned(result, [{ value: 'not-a-ur', type: 'qr' }]);

      await waitFor(() => {
        expect(result.current.scanError).not.toBeNull();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.scanError).toBeNull();
      expect(result.current.progress).toBe(0);
    });
  });

  describe('inactive state', () => {
    it('does not process scanned codes when inactive', async () => {
      setupSuccessfulDecoder(SUPPORTED_UR_TYPE.CRYPTO_HDKEY);
      const { result } = renderScannerHook({ isActive: false });

      await mockOnCodeScanned(result, [
        { value: 'ur:crypto-hdkey/mock-part', type: 'qr' },
      ]);

      expect(mockOnScanSuccess).not.toHaveBeenCalled();
    });
  });

  describe('camera error', () => {
    it('provides onError handler that sends analytics', async () => {
      const { result } = renderScannerHook();

      await waitFor(() => {
        expect(result.current.onError).toBeDefined();
      });

      await act(async () => {
        await result.current.onError(new Error('Camera initialization failed'));
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
      });
    });
  });
});
