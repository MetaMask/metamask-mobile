import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { SUPPORTED_UR_TYPE } from '../../../../../constants/qr';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { HardwareDeviceTypes } from '../../../../../constants/keyringTypes';
import type { UseAnalyticsHook } from '../../../../../components/hooks/useAnalytics/useAnalytics.types';
import {
  getExpectedUrTypes,
  sendQrHardwareErrorAnalytics,
  useCameraPermissionRefresh,
} from './qrScannerUtils';

jest.mock('../../../../../core/QrKeyring/QrKeyring', () => ({
  withQrKeyring: jest.fn(async (callback) =>
    callback({
      keyring: { getName: jest.fn().mockResolvedValue('MockDevice') },
      metadata: { id: 'mock-id' },
    }),
  ),
}));

describe('getExpectedURTypes', () => {
  it('returns pairing UR types for pair requests', () => {
    expect(getExpectedUrTypes(QrScanRequestType.PAIR)).toEqual([
      SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
      SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT,
    ]);
  });

  it('returns signature UR type for sign requests', () => {
    expect(getExpectedUrTypes(QrScanRequestType.SIGN)).toEqual([
      SUPPORTED_UR_TYPE.ETH_SIGNATURE,
    ]);
  });
});

describe('sendQrHardwareErrorAnalytics', () => {
  type AnalyticsBuilder = ReturnType<UseAnalyticsHook['createEventBuilder']>;

  const mockTrackEvent = jest.fn();
  const mockBuild = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuilder = {
    addProperties: mockAddProperties,
    addSensitiveProperties: jest.fn(),
    removeProperties: jest.fn(),
    removeSensitiveProperties: jest.fn(),
    build: mockBuild,
  } as unknown as AnalyticsBuilder;
  const mockCreateEventBuilder = jest.fn(() => mockBuilder);
  const analyticsDependencies: Parameters<
    typeof sendQrHardwareErrorAnalytics
  >[1] = {
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue(mockBuilder);
    mockBuild.mockReturnValue({ event: 'built-event' });
  });

  it('tracks QR hardware errors with the QR keyring device name', async () => {
    await sendQrHardwareErrorAnalytics(
      { error: 'Camera failed', is_ur_format: false },
      analyticsDependencies,
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
      .requireMock('../../../../../core/QrKeyring/QrKeyring')
      .withQrKeyring.mockRejectedValueOnce(new Error('No QR keyring'));

    await sendQrHardwareErrorAnalytics(
      { error: 'Camera failed', is_ur_format: false },
      analyticsDependencies,
    );

    expect(mockAddProperties).toHaveBeenCalledWith({
      error: 'Camera failed',
      is_ur_format: false,
      device_model: 'Unknown',
      device_type: HardwareDeviceTypes.QR,
    });
  });

  it('does not retry analytics when trackEvent fails after keyring lookup succeeds', async () => {
    mockTrackEvent.mockImplementationOnce(() => {
      throw new Error('Analytics failed');
    });

    await expect(
      sendQrHardwareErrorAnalytics(
        { error: 'Camera failed', is_ur_format: false },
        analyticsDependencies,
      ),
    ).rejects.toThrow('Analytics failed');

    expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
    expect(mockAddProperties).toHaveBeenCalledWith({
      error: 'Camera failed',
      is_ur_format: false,
      device_model: 'MockDevice',
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

  it('does not request camera permission when permission is already granted', () => {
    renderHook(() =>
      useCameraPermissionRefresh({
        isActive: true,
        hasPermission: true,
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
    mockRequestPermission.mockClear();

    act(() => {
      onChange('background');
      onChange('active');
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);

    addEventListenerSpy.mockRestore();
  });
});
