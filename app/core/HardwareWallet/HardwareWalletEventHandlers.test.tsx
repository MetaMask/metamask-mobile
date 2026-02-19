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
import { useDeviceEventHandlers } from './HardwareWalletEventHandlers';
import { HardwareWalletAdapter } from './types';
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
    };

    // Create mock refs
    mockRefs = {
      adapterRef: { current: mockAdapter },
      isConnectingRef: { current: false },
      abortControllerRef: { current: null },
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

    it('skips update if status is the same (non-error)', () => {
      lastConnectionState = { status: ConnectionStatus.Connecting };
      const { result } = createHook();

      act(() => {
        result.current.updateConnectionState({
          status: ConnectionStatus.Connecting,
        });
      });

      // The setter was called but should return same state
      expect(mockSetters.setConnectionState).toHaveBeenCalled();
      // Since we return prev in that case, lastConnectionState is unchanged
    });

    it('always updates error states', () => {
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

      lastConnectionState = {
        status: ConnectionStatus.ErrorState,
        error: error1,
      };
      const { result } = createHook();

      act(() => {
        result.current.updateConnectionState({
          status: ConnectionStatus.ErrorState,
          error: error2,
        });
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
      if (lastConnectionState.status === ConnectionStatus.ErrorState) {
        expect(lastConnectionState.error.message).toBe('Error 2');
      }
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

  describe('clearError', () => {
    it('clears error state and returns to disconnected', () => {
      const error = new HardwareWalletError('Test', {
        code: ErrorCode.Unknown,
        severity: Severity.Err,
        category: Category.Unknown,
        userMessage: 'Test',
      });
      lastConnectionState = { status: ConnectionStatus.ErrorState, error };

      const { result } = createHook();

      act(() => {
        result.current.clearError();
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.Disconnected);
    });

    it('does not change non-error states', () => {
      lastConnectionState = {
        status: ConnectionStatus.Connected,
        deviceId: 'device-123',
      };

      const { result } = createHook();

      act(() => {
        result.current.clearError();
      });

      expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
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

      it('creates error if not provided', () => {
        const { result } = createHook();

        act(() => {
          result.current.handleDeviceEvent({
            event: DeviceEvent.DeviceLocked,
          });
        });

        expect(lastConnectionState.status).toBe(ConnectionStatus.ErrorState);
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

      it('does not change state if no error', () => {
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

        // State should remain unchanged since no error
        expect(lastConnectionState.status).toBe(
          ConnectionStatus.AwaitingConfirmation,
        );
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
    it('defaults to Ledger for error handling', () => {
      const { result } = createHook(null);

      act(() => {
        result.current.handleError(new Error('Test'));
      });

      // Should still handle error without crashing
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
          // No error provided
        });
      });

      // State should remain connected since no error to handle
      expect(lastConnectionState.status).toBe(ConnectionStatus.Connected);
    });
  });

  describe('ConnectionFailed without error', () => {
    it('still resets isConnecting flag', () => {
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
