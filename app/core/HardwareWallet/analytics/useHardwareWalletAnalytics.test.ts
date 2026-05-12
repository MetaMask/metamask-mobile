import { renderHook, act } from '@testing-library/react-hooks';
import {
  HardwareWalletError,
  ErrorCode,
  Severity,
  Category,
  HardwareWalletType,
  ConnectionStatus,
  type HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';
import { useHardwareWalletAnalytics } from './useHardwareWalletAnalytics';
import {
  HardwareWalletAnalyticsErrorType,
  HardwareWalletAnalyticsFlow,
} from './helpers';
import { MetaMetricsEvents } from '../../Analytics';
import { createQRHardwareScanError, QRHardwareScanErrorType } from '../errors';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ name: 'built-event' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
});

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

function createError(
  code: ErrorCode,
  message = 'Test error',
): HardwareWalletError {
  return new HardwareWalletError(message, {
    code,
    severity: Severity.Err,
    category: Category.Connection,
    userMessage: message,
  });
}

describe('useHardwareWalletAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultOptions = {
    connectionState: {
      status: ConnectionStatus.Disconnected,
    } as HardwareWalletConnectionState,
    walletType: HardwareWalletType.Ledger,
    flow: HardwareWalletAnalyticsFlow.Connection,
    deviceModel: 'Nano X',
  };

  describe('Recovery Modal Viewed', () => {
    it('fires when transitioning to ErrorState', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      const errorState: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error: createError(ErrorCode.DeviceDisconnected, 'Disconnected'),
      };

      rerender({ ...defaultOptions, connectionState: errorState });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_MODAL_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Connection',
          device_type: 'Ledger',
          device_model: 'Nano X',
          error_type: HardwareWalletAnalyticsErrorType.DeviceDisconnected,
          error_type_view_count: 1,
          error_code: String(ErrorCode.DeviceDisconnected),
          error_message: 'Disconnected',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('includes QR scan analytics when error is a QR hardware scan failure', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      const qrError = createQRHardwareScanError({
        errorType: QRHardwareScanErrorType.NonURQrScanned,
        purpose: QrScanRequestType.PAIR,
        isUrFormat: false,
      });

      rerender({
        ...defaultOptions,
        walletType: HardwareWalletType.Qr,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: qrError,
        },
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: HardwareWalletAnalyticsErrorType.GenericError,
          error_category: 'non_ur_qr_scanned',
          is_ur_format: false,
        }),
      );
    });

    it('includes received_ur_type for wrong UR type QR scan errors', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      const qrError = createQRHardwareScanError({
        errorType: QRHardwareScanErrorType.WrongURType,
        purpose: QrScanRequestType.SIGN,
        receivedUrType: 'eth-signature',
        isUrFormat: true,
      });

      rerender({
        ...defaultOptions,
        walletType: HardwareWalletType.Qr,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: qrError,
        },
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          error_category: 'wrong_ur_type',
          is_ur_format: true,
          received_ur_type: 'eth-signature',
        }),
      );
    });

    it('fires when transitioning to AwaitingApp', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      const awaitingApp: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
        appName: 'Ethereum',
      };

      rerender({ ...defaultOptions, connectionState: awaitingApp });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_MODAL_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: HardwareWalletAnalyticsErrorType.EthereumAppNotOpened,
          error_type_view_count: 1,
        }),
      );
    });

    it('does not fire when status does not change', () => {
      const errorState: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error: createError(ErrorCode.DeviceDisconnected),
      };

      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: { ...defaultOptions, connectionState: errorState },
        },
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      rerender({ ...defaultOptions, connectionState: errorState });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('omits device_model when null', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: { ...defaultOptions, deviceModel: null },
        },
      );

      const errorState: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error: createError(ErrorCode.DeviceDisconnected),
      };

      rerender({
        ...defaultOptions,
        deviceModel: null,
        connectionState: errorState,
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.not.objectContaining({
          device_model: expect.anything(),
        }),
      );
    });
  });

  describe('error_type_view_count', () => {
    it('increments for the same error type', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      const errorState: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error: createError(ErrorCode.DeviceDisconnected),
      };

      rerender({ ...defaultOptions, connectionState: errorState });
      expect(mockAddProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({ error_type_view_count: 1 }),
      );

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Connecting },
      });

      mockAddProperties.mockClear();

      rerender({ ...defaultOptions, connectionState: errorState });
      expect(mockAddProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({ error_type_view_count: 2 }),
      );
    });

    it('starts at 1 for a different error type', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      rerender({
        ...defaultOptions,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });
      expect(mockAddProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error_type: HardwareWalletAnalyticsErrorType.DeviceDisconnected,
          error_type_view_count: 1,
        }),
      );

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Connecting },
      });

      mockAddProperties.mockClear();

      rerender({
        ...defaultOptions,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.BluetoothDisabled),
        },
      });
      expect(mockAddProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error_type: HardwareWalletAnalyticsErrorType.BluetoothDisabled,
          error_type_view_count: 1,
        }),
      );
    });

    it('resets on success', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      rerender({
        ...defaultOptions,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Ready },
      });

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Disconnected },
      });

      mockAddProperties.mockClear();

      rerender({
        ...defaultOptions,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });
      expect(mockAddProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({ error_type_view_count: 1 }),
      );
    });
  });

  describe('Recovery Success Modal Viewed', () => {
    it('fires when transitioning to Ready after an error', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      rerender({
        ...defaultOptions,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected, 'Disconnected'),
        },
      });

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockTrackEvent.mockClear();

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Ready },
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_SUCCESS_MODAL_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Connection',
          device_type: 'Ledger',
          device_model: 'Nano X',
          error_type: HardwareWalletAnalyticsErrorType.DeviceDisconnected,
          error_type_view_count: 1,
          error_code: String(ErrorCode.DeviceDisconnected),
          error_message: 'Disconnected',
        }),
      );
    });

    it('fires without error properties when no preceding error occurred', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Ready },
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_SUCCESS_MODAL_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.not.objectContaining({
          error_type: expect.anything(),
          error_type_view_count: expect.anything(),
        }),
      );
    });
  });

  describe('CTA Clicked', () => {
    it('fires with correct properties', () => {
      const errorState: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error: createError(ErrorCode.BluetoothDisabled, 'BT off'),
      };

      const { result } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: { ...defaultOptions, connectionState: errorState },
        },
      );

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockTrackEvent.mockClear();

      act(() => {
        result.current.trackCTAClicked();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_CTA_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Connection',
          device_type: 'Ledger',
          device_model: 'Nano X',
          error_type: HardwareWalletAnalyticsErrorType.BluetoothDisabled,
          error_type_view_count: 1,
          error_code: String(ErrorCode.BluetoothDisabled),
          error_message: 'BT off',
        }),
      );
    });

    it('does not fire when not in an error state', () => {
      const { result } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      mockTrackEvent.mockClear();

      act(() => {
        result.current.trackCTAClicked();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires for AwaitingApp state', () => {
      const awaitingApp: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
        appName: 'Ethereum',
      };

      const { result } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: { ...defaultOptions, connectionState: awaitingApp },
        },
      );

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockTrackEvent.mockClear();

      act(() => {
        result.current.trackCTAClicked();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: HardwareWalletAnalyticsErrorType.EthereumAppNotOpened,
        }),
      );
    });
  });

  describe('flow variants', () => {
    it('tracks Transaction flow', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: {
            ...defaultOptions,
            flow: HardwareWalletAnalyticsFlow.Transaction,
          },
        },
      );

      rerender({
        ...defaultOptions,
        flow: HardwareWalletAnalyticsFlow.Transaction,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Transaction' }),
      );
    });

    it('tracks Message flow', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: {
            ...defaultOptions,
            flow: HardwareWalletAnalyticsFlow.Message,
          },
        },
      );

      rerender({
        ...defaultOptions,
        flow: HardwareWalletAnalyticsFlow.Message,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Message' }),
      );
    });

    it('tracks Send flow', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: {
            ...defaultOptions,
            flow: HardwareWalletAnalyticsFlow.Send,
          },
        },
      );

      rerender({
        ...defaultOptions,
        flow: HardwareWalletAnalyticsFlow.Send,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Send' }),
      );
    });

    it('tracks Swaps flow', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        {
          initialProps: {
            ...defaultOptions,
            flow: HardwareWalletAnalyticsFlow.Swaps,
          },
        },
      );

      rerender({
        ...defaultOptions,
        flow: HardwareWalletAnalyticsFlow.Swaps,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Swaps' }),
      );
    });

    it('defaults to Connection flow', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      rerender({
        ...defaultOptions,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Connection' }),
      );
    });
  });

  describe('spurious disconnect mid-flow', () => {
    it('preserves error state across disconnect so success includes it', () => {
      const { rerender } = renderHook(
        (props) => useHardwareWalletAnalytics(props),
        { initialProps: defaultOptions },
      );

      rerender({
        ...defaultOptions,
        connectionState: {
          status: ConnectionStatus.ErrorState,
          error: createError(ErrorCode.DeviceDisconnected),
        },
      });

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Disconnected },
      });

      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();

      rerender({
        ...defaultOptions,
        connectionState: { status: ConnectionStatus.Ready },
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_SUCCESS_MODAL_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: HardwareWalletAnalyticsErrorType.DeviceDisconnected,
          error_type_view_count: 1,
        }),
      );
    });
  });
});
