import { renderHook, act } from '@testing-library/react-hooks';
import {
  HardwareWalletError,
  ErrorCode,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';
import { useDeviceEventHandlers } from './HardwareWalletEventHandlers';
import { ConnectionStatus, ConnectionState } from './connectionState';
import { DeviceEvent, HardwareWalletAdapter } from './types';
import { HardwareWalletType } from './helpers';
import {
  HardwareWalletRefs,
  HardwareWalletStateSetters,
} from './HardwareWalletStateManager';

// Mock the errors module - use jest.requireActual inside to avoid hoisting issues
jest.mock('./errors', () => {
  const {
    HardwareWalletError: MockHardwareWalletError,
    ErrorCode: MockErrorCode,
    Severity: MockSeverity,
    Category: MockCategory,
  } = jest.requireActual('@metamask/hw-wallet-sdk');
  return {
    createHardwareWalletError: jest.fn((error: unknown) => {
      if (error instanceof MockHardwareWalletError) {
        return error;
      }
      return new MockHardwareWalletError(
        error instanceof Error ? error.message : String(error),
        {
          code: MockErrorCode.Unknown,
          severity: MockSeverity.Err,
          category: MockCategory.Unknown,
          userMessage: String(error),
        },
      );
    }),
    parseErrorByType: jest.fn(
      (error: unknown) =>
        new MockHardwareWalletError(
          error instanceof Error ? error.message : String(error),
          {
            code: MockErrorCode.Unknown,
            severity: MockSeverity.Err,
            category: MockCategory.Unknown,
            userMessage: String(error),
          },
        ),
    ),
  };
});

describe('useDeviceEventHandlers', () => {
  let mockRefs: HardwareWalletRefs;
  let mockSetters: HardwareWalletStateSetters;
  let mockAdapter: jest.Mocked<HardwareWalletAdapter>;
  let lastConnectionState: ReturnType<typeof ConnectionState.disconnected>;

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
    };

    // Create mock refs
    mockRefs = {
      adapterRef: { current: mockAdapter },
      isConnectingRef: { current: false },
      abortControllerRef: { current: null },
    };

    // Track last connection state for assertion
    lastConnectionState = ConnectionState.disconnected();

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
      setPermissionState: jest.fn(),
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
    it('should update connection state', () => {
      const { result } = createHook();

      act(() => {
        result.current.updateConnectionState(ConnectionState.connecting());
      });

      expect(mockSetters.setConnectionState).toHaveBeenCalled();
      expect(lastConnectionState.status).toBe(ConnectionStatus.Connecting);
    });

    it('should not update if status is the same (non-error)', () => {
      lastConnectionState = ConnectionState.connecting();
      const { result } = createHook();

      act(() => {
        result.current.updateConnectionState(ConnectionState.connecting());
      });

      // The setter was called but should return same state
      expect(mockSetters.setConnectionState).toHaveBeenCalled();
      // Since we return prev in that case, lastConnectionState is unchanged
    });

    it('should always update error states', () => {
      const error1 = new HardwareWalletError('Error 1', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Error 1',
      });
      const error2 = new HardwareWalletError('Error 2', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Error 2',
      });

      lastConnectionState = ConnectionState.error(error1);
      const { result } = createHook();

      act(() => {
        result.current.updateConnectionState(ConnectionState.error(error2));
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
      if (lastConnectionState.status === 'error') {
        expect(lastConnectionState.error.message).toBe('Error 2');
      }
    });
  });

  describe('handleError', () => {
    it('should handle HardwareWalletError', () => {
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

    it('should handle generic Error', () => {
      const { result } = createHook();
      const error = new Error('Generic error');

      act(() => {
        result.current.handleError(error);
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });

    it('should handle string error', () => {
      const { result } = createHook();

      act(() => {
        result.current.handleError('String error');
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });

    it('should reset isConnecting flag', () => {
      mockRefs.isConnectingRef.current = true;
      const { result } = createHook();

      act(() => {
        result.current.handleError(new Error('Test'));
      });

      expect(mockRefs.isConnectingRef.current).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state and return to disconnected', () => {
      const error = new HardwareWalletError('Test', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Test',
      });
      lastConnectionState = ConnectionState.error(error);

      const { result } = createHook();

      act(() => {
        result.current.clearError();
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.Disconnected);
    });

    it('should not change non-error states', () => {
      lastConnectionState = ConnectionState.connected('device-123');

      const { result } = createHook();

      act(() => {
        result.current.clearError();
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
    });
  });

  describe('handleDeviceEvent', () => {
    describe('Connected event', () => {
      it('should update to connected state', () => {
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

      it('should handle missing deviceId', () => {
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.Connected,
          });
        });

        // Should not set deviceId if not provided
        expect(mockSetters.setDeviceId).not.toHaveBeenCalled();
      });
    });

    describe('Disconnected event', () => {
      it('should update to disconnected state', () => {
        lastConnectionState = ConnectionState.connected('device-123');
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
      it('should update to connected state', () => {
        lastConnectionState = ConnectionState.awaitingApp('Bitcoin');
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
      it('should update to awaiting app state', () => {
        lastConnectionState = ConnectionState.connected('device-123');
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.AppClosed,
            appName: 'Bitcoin',
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.AwaitingApp);
        if (lastConnectionState.status === 'awaiting_app') {
          // Always uses 'Ethereum' as the required app, regardless of what's currently open
          expect(lastConnectionState.requiredApp).toBe('Ethereum');
        }
      });
    });

    describe('DeviceLocked event', () => {
      it('should handle with provided error', () => {
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

      it('should create error if not provided', () => {
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.DeviceLocked,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
      });
    });

    describe('ConfirmationRequired event', () => {
      it('should update to awaiting confirmation state', () => {
        lastConnectionState = ConnectionState.connected('device-123');
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
      it('should return to connected state', () => {
        lastConnectionState =
          ConnectionState.awaitingConfirmation('device-123');
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
      it('should handle error if provided', () => {
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

      it('should not change state if no error', () => {
        lastConnectionState =
          ConnectionState.awaitingConfirmation('device-123');
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.ConfirmationRejected,
          });
        });

        // State should remain unchanged since no error
        expect(lastConnectionState.status).toBe(
          ConnectionStatus.AwaitingConfirmation,
        );
      });
    });

    describe('ConnectionFailed event', () => {
      it('should handle error', () => {
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
      it('should handle error', () => {
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

    describe('PermissionChanged event', () => {
      it('should not change connection state', () => {
        lastConnectionState = ConnectionState.connected('device-123');
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.PermissionChanged,
          });
        });

        // Should remain unchanged - permissions handled separately
        expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
      });
    });
  });

  describe('with null walletType', () => {
    it('should default to Ledger for error handling', () => {
      const { result } = createHook(null);

      act(() => {
        result.current.handleError(new Error('Test'));
      });

      // Should still handle error without crashing
      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
    });
  });

  describe('with null adapter', () => {
    it('should handle events gracefully', () => {
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
    it('should handle unknown event types gracefully', () => {
      lastConnectionState = ConnectionState.connected('device-123');
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

    it('should not crash on malformed event payload', () => {
      lastConnectionState = ConnectionState.disconnected();
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
    it('should not change state when no error provided', () => {
      lastConnectionState = ConnectionState.connected('device-123');
      const { result } = createHook();

      act(() => {
        result.current.handleDeviceEvent({
          event: DeviceEvent.OperationTimeout,
          // No error provided
        });
      });

      // State should remain connected since no error to handle
      expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
    });
  });

  describe('ConnectionFailed without error', () => {
    it('should still reset isConnecting flag', () => {
      mockRefs.isConnectingRef.current = true;
      const { result } = createHook();

      act(() => {
        result.current.handleDeviceEvent({
          event: DeviceEvent.ConnectionFailed,
          // No error provided
        });
      });

      // isConnecting should be reset
      expect(mockRefs.isConnectingRef.current).toBe(false);
    });
  });
});
