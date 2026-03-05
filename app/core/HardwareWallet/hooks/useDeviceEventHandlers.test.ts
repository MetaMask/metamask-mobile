import { renderHook, act } from '@testing-library/react-hooks';
import {
  HardwareWalletError,
  ErrorCode,
  Severity,
  Category,
  HardwareWalletType,
  ConnectionStatus,
  DeviceEvent,
  HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';
import { useDeviceEventHandlers } from './useDeviceEventHandlers';
import { HardwareWalletAdapter } from '../types';
import {
  HardwareWalletRefs,
  HardwareWalletStateSetters,
} from './useHardwareWalletStateManager';

describe('useDeviceEventHandlers', () => {
  let mockRefs: HardwareWalletRefs;
  let mockSetters: HardwareWalletStateSetters;
  let mockAdapter: jest.Mocked<HardwareWalletAdapter>;
  let lastConnectionState: HardwareWalletConnectionState;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock adapter
    mockAdapter = {
      walletType: HardwareWalletType.Ledger,
      requiresDeviceDiscovery: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getConnectedDeviceId: jest.fn().mockReturnValue('device-123'),
      ensureDeviceReady: jest.fn(),
      isConnected: jest.fn(),
      reset: jest.fn(),
      markFlowComplete: jest.fn(),
      isFlowComplete: jest.fn().mockReturnValue(false),
      resetFlowState: jest.fn(),
      startDeviceDiscovery: jest.fn().mockReturnValue(jest.fn()),
      stopDeviceDiscovery: jest.fn(),
      isTransportAvailable: jest.fn(() => Promise.resolve(true)),
      getRequiredAppName: jest.fn().mockReturnValue('Ethereum'),
      getTransportDisabledErrorCode: jest
        .fn()
        .mockReturnValue(ErrorCode.BluetoothDisabled),
    };

    // Create mock refs
    mockRefs = {
      adapterRef: { current: mockAdapter },
      isConnectingRef: { current: false },
      abortControllerRef: { current: null },
      targetWalletTypeRef: { current: null },
    };

    // Track last connection state for assertion
    lastConnectionState = { status: ConnectionStatus.Disconnected };

    // Create mock setters
    mockSetters = {
      setConnectionState: jest.fn((update) => {
        if (typeof update === 'function') {
          lastConnectionState = update(lastConnectionState);
        } else {
          lastConnectionState = update;
        }
      }),
      setDeviceId: jest.fn(),
      setTargetWalletType: jest.fn(),
    };
  });

  const createHook = (
    walletType: HardwareWalletType | null = HardwareWalletType.Ledger,
  ) =>
    renderHook(() =>
      useDeviceEventHandlers({
        refs: mockRefs,
        setters: mockSetters,
        walletType,
      }),
    );

  describe('updateConnectionState', () => {
    it('updates connection state', () => {
      const { result } = createHook();

      act(() => {
        result.current.updateConnectionState({
          status: ConnectionStatus.Connecting,
        });
      });

      expect(mockSetters.setConnectionState).toHaveBeenCalled();
      expect(lastConnectionState.status).toBe(ConnectionStatus.Connecting);
    });

    it('updates state even when status is the same but data differs', () => {
      lastConnectionState = {
        status: ConnectionStatus.Connected,
        deviceId: 'device-old',
      };
      const { result } = createHook();

      act(() => {
        result.current.updateConnectionState({
          status: ConnectionStatus.Connected,
          deviceId: 'device-new',
        });
      });

      expect(lastConnectionState).toEqual({
        status: ConnectionStatus.Connected,
        deviceId: 'device-new',
      });
    });
  });

  describe('handleError', () => {
    it('handles HardwareWalletError', () => {
      const { result } = createHook();
      const hwError = new HardwareWalletError('Test error', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Test error',
      });

      act(() => {
        result.current.handleError(hwError);
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
      expect(mockRefs.isConnectingRef.current).toBe(false);
    });

    it('handles generic Error', () => {
      const { result } = createHook();
      const error = new Error('Generic error');

      act(() => {
        result.current.handleError(error);
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });

    it('handles string error', () => {
      const { result } = createHook();

      act(() => {
        result.current.handleError('String error');
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });

    it('resets isConnecting flag', () => {
      mockRefs.isConnectingRef.current = true;
      const { result } = createHook();

      act(() => {
        result.current.handleError(new Error('Test'));
      });

      expect(mockRefs.isConnectingRef.current).toBe(false);
    });
  });

  describe('handleDeviceEvent', () => {
    describe('Connected event', () => {
      it('updates to connected state', () => {
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.Connected,
            deviceId: 'device-456',
          });
        });

        expect(mockSetters.setDeviceId).toHaveBeenCalledWith('device-456');
        expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
        expect(mockRefs.isConnectingRef.current).toBe(false);
      });

      it('falls back to adapter deviceId when payload has none', () => {
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.Connected,
          });
        });

        expect(mockSetters.setDeviceId).toHaveBeenCalledWith('device-123');
        expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
        expect(mockRefs.isConnectingRef.current).toBe(false);
      });
    });

    describe('Disconnected event', () => {
      it('updates to disconnected state', () => {
        lastConnectionState = {
          status: ConnectionStatus.Connected,
          deviceId: 'device-123',
        };
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.Disconnected,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.Disconnected);
        expect(mockRefs.isConnectingRef.current).toBe(false);
      });
    });

    describe('AppOpened event', () => {
      it('updates to connected state', () => {
        lastConnectionState = {
          status: ConnectionStatus.AwaitingApp,
          deviceId: 'device-123',
          appName: 'Bitcoin',
        };
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.AppOpened,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
      });
    });

    describe('AppClosed event', () => {
      it('updates to awaiting app state', () => {
        lastConnectionState = {
          status: ConnectionStatus.Connected,
          deviceId: 'device-123',
        } as HardwareWalletConnectionState;
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.AppNotOpen,
            currentAppName: 'Bitcoin',
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.AwaitingApp);
        if (lastConnectionState.status === ConnectionStatus.AwaitingApp) {
          // Always uses 'Ethereum' as the required app, regardless of what's currently open
          expect(lastConnectionState.appName).toBe('Ethereum');
        }
      });
    });

    describe('DeviceLocked event', () => {
      it('handles with provided error', () => {
        const { result } = createHook();
        const error = new Error('Device locked');

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.DeviceLocked,
            error,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
      });

      it('creates error with AuthenticationDeviceLocked code if not provided', () => {
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.DeviceLocked,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
        if (lastConnectionState.status === ConnectionStatus.ErrorState) {
          expect(lastConnectionState.error.code).toBe(
            ErrorCode.AuthenticationDeviceLocked,
          );
        }
      });

      it('resets isConnecting flag regardless of error presence', () => {
        mockRefs.isConnectingRef.current = true;
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.DeviceLocked,
          });
        });

        expect(mockRefs.isConnectingRef.current).toBe(false);
      });
    });

    describe('ConfirmationRequired event', () => {
      it('updates to awaiting confirmation state', () => {
        lastConnectionState = {
          status: ConnectionStatus.Connected,
          deviceId: 'device-123',
        };
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.ConfirmationRequired,
          });
        });

        expect(lastConnectionState.status).toBe(
          ConnectionStatus.AwaitingConfirmation,
        );
      });
    });

    describe('ConfirmationReceived event', () => {
      it('returns to connected state', () => {
        lastConnectionState = {
          status: ConnectionStatus.AwaitingConfirmation,
          deviceId: 'device-123',
        };
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.ConfirmationReceived,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
      });
    });

    describe('ConfirmationRejected event', () => {
      it('handles error if provided', () => {
        const { result } = createHook();
        const error = new Error('User rejected');

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.ConfirmationRejected,
            error,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
      });

      it('returns to connected state if no error', () => {
        lastConnectionState = {
          status: ConnectionStatus.AwaitingConfirmation,
          deviceId: 'device-123',
        };
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.ConfirmationRejected,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
      });
    });

    describe('ConnectionFailed event', () => {
      it('handles error', () => {
        const { result } = createHook();
        const error = new Error('Connection failed');

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.ConnectionFailed,
            error,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
        expect(mockRefs.isConnectingRef.current).toBe(false);
      });
    });

    describe('OperationTimeout event', () => {
      it('handles error', () => {
        const { result } = createHook();
        const error = new Error('Operation timed out');

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.OperationTimeout,
            error,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
      });
    });
  });

  describe('with null walletType', () => {
    it('falls back to adapter walletType for error handling', () => {
      const { result } = createHook(null);

      act(() => {
        result.current.handleError(new Error('Test'));
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });

    it('handles error when both walletType and adapter walletType are null', () => {
      mockRefs.adapterRef.current = null;
      const { result } = createHook(null);

      act(() => {
        result.current.handleError(new Error('Test'));
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });

    it('handles DeviceLocked when both walletType and adapter walletType are null', () => {
      mockRefs.adapterRef.current = null;
      const { result } = createHook(null);

      act(() => {
        result.current.handleDeviceEvent({
          event: DeviceEvent.DeviceLocked,
        });
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });
  });

  describe('with null adapter', () => {
    it('handles events gracefully', () => {
      mockRefs.adapterRef.current = null;
      const { result } = createHook();

      // AppOpened needs to get deviceId from adapter
      act(() => {
        result.current.handleDeviceEvent({
          event: DeviceEvent.AppOpened,
        });
      });

      // Should still update state, using empty deviceId
      expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
    });
  });

  describe('unknown device events', () => {
    it('handles unknown event types gracefully', () => {
      lastConnectionState = {
        status: ConnectionStatus.Connected,
        deviceId: 'device-123',
      };
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Suppress warning in test output
        });
      const { result } = createHook();

      act(() => {
        // Pass an unknown event type
        result.current.handleDeviceEvent({
          event: 'unknown_event_type' as DeviceEvent,
        });
      });

      // State should remain unchanged
      expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);

      consoleWarnSpy.mockRestore();
    });

    it('does not crash on malformed event payload', () => {
      lastConnectionState = { status: ConnectionStatus.Disconnected };
      const { result } = createHook();

      // This should not throw
      expect(() => {
        act(() => {
          result.current.handleDeviceEvent({
            event: 'completely_invalid' as DeviceEvent,
          });
        });
      }).not.toThrow();
    });
  });

  describe('OperationTimeout without error', () => {
    it('does not change state when no error provided', () => {
      lastConnectionState = {
        status: ConnectionStatus.Connected,
        deviceId: 'device-123',
      };
      const { result } = createHook();

      act(() => {
        result.current.handleDeviceEvent({
          event: DeviceEvent.OperationTimeout,
        });
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
    });

    it('resets isConnecting flag regardless of error presence', () => {
      mockRefs.isConnectingRef.current = true;
      const { result } = createHook();

      act(() => {
        result.current.handleDeviceEvent({
          event: DeviceEvent.OperationTimeout,
        });
      });

      expect(mockRefs.isConnectingRef.current).toBe(false);
    });
  });

  describe('ConnectionFailed without error', () => {
    it('transitions to disconnected and resets isConnecting flag', () => {
      mockRefs.isConnectingRef.current = true;
      lastConnectionState = { status: ConnectionStatus.Connecting };
      const { result } = createHook();

      act(() => {
        result.current.handleDeviceEvent({
          event: DeviceEvent.ConnectionFailed,
        });
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.Disconnected);
      expect(mockRefs.isConnectingRef.current).toBe(false);
    });
  });
});
