import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import {
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';
import {
  buildQrHardwareWalletErrorAnalyticsProperties,
  getExpectedURTypes,
  isSameScanError,
  sendQrHardwareErrorAnalytics,
  useCameraPermissionRefresh,
} from './AnimatedQRScanner.utils';

jest.mock('../../../core/QrKeyring/QrKeyring', () => ({
  withQrKeyring: jest.fn(async (callback) =>
    callback({
      keyring: { getName: jest.fn().mockResolvedValue('MockDevice') },
      metadata: { id: 'mock-id' },
    }),
  ),
}));

function makeScanError(
  overrides: {
    message?: string;
    qrHardwareScanErrorType?: QRHardwareScanErrorType;
    isUrFormat?: boolean;
    receivedUrType?: string;
  } = {},
): QRHardwareScanError {
  return {
    message: overrides.message ?? 'Error',
    metadata: {
      qrHardwareScanErrorType:
        overrides.qrHardwareScanErrorType ??
        QRHardwareScanErrorType.NonURQrScanned,
      isUrFormat: overrides.isUrFormat ?? false,
      receivedUrType: overrides.receivedUrType,
    },
  } as unknown as QRHardwareScanError;
}

describe('isSameScanError', () => {
  it('returns false when there is no previous scan error', () => {
    expect(isSameScanError(null, makeScanError())).toBe(false);
  });

  it('returns true when all metadata fields match', () => {
    const shared = {
      message: 'Expected crypto-hdkey QR code',
      qrHardwareScanErrorType: QRHardwareScanErrorType.WrongURType,
      isUrFormat: true,
      receivedUrType: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
    };

    expect(isSameScanError(makeScanError(shared), makeScanError(shared))).toBe(
      true,
    );
  });

  it('returns true when both receivedUrType are undefined', () => {
    const shared = {
      message: 'Scanned QR code is not in UR format',
      qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
      isUrFormat: false,
    };

    expect(isSameScanError(makeScanError(shared), makeScanError(shared))).toBe(
      true,
    );
  });

  it.each([
    [
      'receivedUrType',
      { receivedUrType: SUPPORTED_UR_TYPE.ETH_SIGNATURE },
      { receivedUrType: SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT },
    ],
    ['message', { message: 'Error A' }, { message: 'Error B' }],
    ['isUrFormat', { isUrFormat: true }, { isUrFormat: false }],
    [
      'qrHardwareScanErrorType',
      { qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned },
      { qrHardwareScanErrorType: QRHardwareScanErrorType.URDecodeError },
    ],
  ] as const)(
    'returns false when %s differs',
    (_field, prevOverrides, currOverrides) => {
      const base = {
        message: 'Error',
        isUrFormat: false,
        qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
      } as const;
      expect(
        isSameScanError(
          makeScanError({ ...base, ...prevOverrides }),
          makeScanError({ ...base, ...currOverrides }),
        ),
      ).toBe(false);
    },
  );
});

describe('buildQrHardwareWalletErrorAnalyticsProperties', () => {
  it('includes received_ur_type only for wrong UR type errors', () => {
    expect(
      buildQrHardwareWalletErrorAnalyticsProperties({
        error: 'Wrong QR',
        error_category: QRHardwareScanErrorType.WrongURType,
        is_ur_format: true,
        received_ur_type: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
      }),
    ).toEqual({
      error: 'Wrong QR',
      error_category: QRHardwareScanErrorType.WrongURType,
      is_ur_format: true,
      received_ur_type: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
    });

    expect(
      buildQrHardwareWalletErrorAnalyticsProperties({
        error: 'Decode failed',
        error_category: QRHardwareScanErrorType.URDecodeError,
        is_ur_format: true,
        received_ur_type: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
      }),
    ).toEqual({
      error: 'Decode failed',
      error_category: QRHardwareScanErrorType.URDecodeError,
      is_ur_format: true,
    });
  });

  it('falls back to an empty received_ur_type for wrong UR type errors', () => {
    expect(
      buildQrHardwareWalletErrorAnalyticsProperties({
        error: 'Wrong QR',
        error_category: QRHardwareScanErrorType.WrongURType,
        is_ur_format: true,
      }),
    ).toEqual({
      error: 'Wrong QR',
      error_category: QRHardwareScanErrorType.WrongURType,
      is_ur_format: true,
      received_ur_type: '',
    });
  });
});

describe('getExpectedURTypes', () => {
  it('returns pairing UR types for pair requests', () => {
    expect(getExpectedURTypes(QrScanRequestType.PAIR)).toEqual([
      SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
      SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT,
    ]);
  });

  it('returns signature UR type for sign requests', () => {
    expect(getExpectedURTypes(QrScanRequestType.SIGN)).toEqual([
      SUPPORTED_UR_TYPE.ETH_SIGNATURE,
    ]);
  });
});

describe('sendQrHardwareErrorAnalytics', () => {
  const mockTrackEvent = jest.fn();
  const mockBuild = jest.fn();
  const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
  const mockCreateEventBuilder = jest.fn(() => ({
    addProperties: mockAddProperties,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({ event: 'built-event' });
  });

  it('tracks QR hardware errors with the QR keyring device name', async () => {
    await sendQrHardwareErrorAnalytics(
      { error: 'Camera failed', is_ur_format: false },
      {
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      } as Parameters<typeof sendQrHardwareErrorAnalytics>[1],
    );

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.HARDWARE_WALLET_ERROR,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      error: 'Camera failed',
      is_ur_format: false,
      device_model: 'MockDevice',
      device_type: HardwareDeviceTypes.QR,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built-event' });
  });

  it('tracks QR hardware errors with unknown device metadata when keyring lookup fails', async () => {
    jest
      .requireMock('../../../core/QrKeyring/QrKeyring')
      .withQrKeyring.mockRejectedValueOnce(new Error('No QR keyring'));

    await sendQrHardwareErrorAnalytics(
      { error: 'Camera failed', is_ur_format: false },
      {
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      } as Parameters<typeof sendQrHardwareErrorAnalytics>[1],
    );

    expect(mockAddProperties).toHaveBeenCalledWith({
      error: 'Camera failed',
      is_ur_format: false,
      device_model: 'Unknown',
      device_type: HardwareDeviceTypes.QR,
    });
  });
});

describe('useCameraPermissionRefresh', () => {
  const mockRequestPermission = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermission.mockResolvedValue(undefined);
  });

  it('requests camera permission when active and permission is missing', () => {
    renderHook(() =>
      useCameraPermissionRefresh({
        isActive: true,
        hasPermission: false,
        requestPermission: mockRequestPermission,
      }),
    );

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not request camera permission when inactive', () => {
    renderHook(() =>
      useCameraPermissionRefresh({
        isActive: false,
        hasPermission: false,
        requestPermission: mockRequestPermission,
      }),
    );

    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('refreshes camera permission after returning to the foreground', () => {
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() });

    renderHook(() =>
      useCameraPermissionRefresh({
        isActive: true,
        hasPermission: false,
        requestPermission: mockRequestPermission,
      }),
    );

    const onChange = addEventListenerSpy.mock.calls[0][1];

    act(() => {
      onChange('background');
      onChange('active');
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(2);

    addEventListenerSpy.mockRestore();
  });
});
