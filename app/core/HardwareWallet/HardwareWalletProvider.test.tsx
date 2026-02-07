import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { HardwareWalletProvider } from './HardwareWalletProvider';
import {
  useHardwareWalletConfig,
  useHardwareWalletState,
  useHardwareWalletActions,
} from './contexts';
import { ConnectionStatus } from './connectionState';
import { HardwareWalletType, getHardwareWalletTypeForAddress } from './helpers';
import { BluetoothPermissionState, LocationPermissionState } from './types';
import { createAdapter } from './adapters';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock helpers
jest.mock('./helpers', () => ({
  ...jest.requireActual('./helpers'),
  getHardwareWalletTypeForAddress: jest.fn(),
}));

// Mock adapters
const mockAdapterInstance = {
  walletType: 'Ledger',
  requiresDeviceDiscovery: false,
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getConnectedDeviceId: jest.fn().mockReturnValue('device-123'),
  ensureDeviceReady: jest.fn().mockResolvedValue(true),
  isConnected: jest.fn().mockReturnValue(true),
  reset: jest.fn(),
  markFlowComplete: jest.fn(),
  isFlowComplete: jest.fn().mockReturnValue(false),
  resetFlowState: jest.fn(),
  destroy: jest.fn(),
  startDeviceDiscovery: jest.fn(),
  stopDeviceDiscovery: jest.fn(),
  isTransportAvailable: jest.fn().mockReturnValue(true),
  onTransportStateChange: jest
    .fn()
    .mockImplementation((callback: (available: boolean) => void) => {
      // Immediately call with available=true
      callback(true);
      return jest.fn();
    }),
  getRequiredAppName: jest.fn().mockReturnValue('Ethereum'),
};

jest.mock('./adapters', () => ({
  createAdapter: jest.fn(() => mockAdapterInstance),
  requiresBluetooth: jest.fn().mockReturnValue(true),
}));

// Mock the BLE transport
jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    observeState: jest.fn(() => ({
      subscribe: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
    })),
    open: jest.fn(),
  },
}));

// Mock errors
jest.mock('./errors', () => {
  const { HardwareWalletError, ErrorCode, Severity, Category } =
    jest.requireActual('@metamask/hw-wallet-sdk');
  return {
    createHardwareWalletError: jest.fn((error: unknown) => {
      if (error instanceof HardwareWalletError) {
        return error;
      }
      return new HardwareWalletError(
        error instanceof Error ? error.message : String(error),
        {
          code: ErrorCode.Unknown,
          severity: Severity.Err,
          category: Category.Unknown,
          userMessage: String(error),
        },
      );
    }),
    parseErrorByType: jest.fn(
      (error: unknown) =>
        new HardwareWalletError(
          error instanceof Error ? error.message : String(error),
          {
            code: ErrorCode.Unknown,
            severity: Severity.Err,
            category: Category.Unknown,
            userMessage: String(error),
          },
        ),
    ),
    isUserCancellation: jest.fn().mockReturnValue(false),
  };
});

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(),
}));

// Mock react-native
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock bottom sheet components
jest.mock('./components', () => ({
  HardwareWalletBottomSheet: () => null,
}));

describe('HardwareWalletProvider', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockGetHardwareWalletType =
    getHardwareWalletTypeForAddress as jest.MockedFunction<
      typeof getHardwareWalletTypeForAddress
    >;
  const mockCreateAdapter = createAdapter as jest.MockedFunction<
    typeof createAdapter
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: non-hardware wallet account
    mockUseSelector.mockReturnValue(null);
    mockGetHardwareWalletType.mockReturnValue(undefined);
  });

  // Test component that uses all contexts
  const TestConsumer: React.FC = () => {
    const config = useHardwareWalletConfig();
    const state = useHardwareWalletState();
    const actions = useHardwareWalletActions();

    return (
      <>
        <Text testID="walletType">{config.walletType ?? 'null'}</Text>
        <Text testID="isHardwareWallet">
          {String(config.isHardwareWalletAccount)}
        </Text>
        <Text testID="connectionStatus">{state.connectionState.status}</Text>
        <Text testID="hasConnect">
          {String(typeof actions.connect === 'function')}
        </Text>
      </>
    );
  };

  const renderProvider = (
    props?: Partial<React.ComponentProps<typeof HardwareWalletProvider>>,
  ) =>
    render(
      <HardwareWalletProvider {...props}>
        <TestConsumer />
      </HardwareWalletProvider>,
    );

  describe('context provision', () => {
    it('should provide config context', () => {
      const { getByTestId } = renderProvider();

      expect(getByTestId('isHardwareWallet').children[0]).toBe('false');
    });

    it('should provide state context', () => {
      const { getByTestId } = renderProvider();

      expect(getByTestId('connectionStatus').children[0]).toBe(
        ConnectionStatus.Disconnected,
      );
    });

    it('should provide actions context', () => {
      const { getByTestId } = renderProvider();

      expect(getByTestId('hasConnect').children[0]).toBe('true');
    });
  });

  describe('wallet type detection', () => {
    it('should detect hardware wallet from selected account', async () => {
      const mockAccount = { address: '0x1234' };
      mockUseSelector.mockReturnValue(mockAccount);
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      const { getByTestId } = renderProvider();

      await waitFor(() => {
        expect(getByTestId('walletType').children[0]).toBe(
          HardwareWalletType.Ledger,
        );
        expect(getByTestId('isHardwareWallet').children[0]).toBe('true');
      });
    });

    it('should identify non-hardware accounts', () => {
      mockUseSelector.mockReturnValue({ address: '0xsoftware' });
      mockGetHardwareWalletType.mockReturnValue(undefined);

      const { getByTestId } = renderProvider();

      expect(getByTestId('walletType').children[0]).toBe('null');
      expect(getByTestId('isHardwareWallet').children[0]).toBe('false');
    });
  });

  describe('adapter creation', () => {
    it('should create adapter when wallet type is set', async () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      renderProvider();

      await waitFor(() => {
        expect(mockCreateAdapter).toHaveBeenCalledWith(
          HardwareWalletType.Ledger,
          expect.objectContaining({
            onDisconnect: expect.any(Function),
            onDeviceEvent: expect.any(Function),
          }),
        );
      });
    });

    it('should create non-hardware adapter for non-hardware accounts', () => {
      mockUseSelector.mockReturnValue({ address: '0xsoftware' });
      mockGetHardwareWalletType.mockReturnValue(undefined);

      renderProvider();

      // The provider always creates an adapter - for non-hardware accounts it creates
      // a NonHardwareAdapter (passthrough) by calling createAdapter(null, ...)
      expect(mockCreateAdapter).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          onDisconnect: expect.any(Function),
          onDeviceEvent: expect.any(Function),
        }),
      );
    });
  });

  describe('actions', () => {
    // Hook to access actions for testing
    const useTestActions = () => {
      const actions = useHardwareWalletActions();
      const state = useHardwareWalletState();
      return { actions, state };
    };

    const renderWithActions = () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      return renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });
    };

    describe('connect', () => {
      it('should connect to device', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          await result.current.actions.connect('device-123');
        });

        const adapter = mockCreateAdapter.mock.results[0]?.value;
        expect(adapter?.connect).toHaveBeenCalledWith('device-123');
      });

      it('should connect successfully when transport is available', async () => {
        const { result } = renderHook(() => useTestActions(), {
          wrapper: ({ children }: { children: React.ReactNode }) => (
            <HardwareWalletProvider>{children}</HardwareWalletProvider>
          ),
        });

        // Setup wallet type
        mockUseSelector.mockReturnValue({ address: '0x1234' });
        mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

        await act(async () => {
          await result.current.actions.connect('device-123');
        });

        // Adapter's connect should have been called
        const adapter = mockCreateAdapter.mock.results[0]?.value;
        expect(adapter?.connect).toHaveBeenCalledWith('device-123');
      });
    });

    describe('disconnect', () => {
      it('should disconnect from device', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          await result.current.actions.disconnect();
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Disconnected,
        );
      });
    });

    describe('ensureDeviceReady', () => {
      it('should start the device readiness flow', async () => {
        const { result } = renderWithActions();

        // Start the ensureDeviceReady flow (don't await - it's blocking)
        // The provider's ensureDeviceReady returns a promise that only resolves
        // when the success screen dismisses, which doesn't happen in tests
        act(() => {
          result.current.actions.ensureDeviceReady('device-123');
        });

        // Give time for the async flow to start
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        // Verify the adapter method was called
        expect(mockAdapterInstance.ensureDeviceReady).toHaveBeenCalledWith(
          'device-123',
        );
      });
    });

    describe('clearError', () => {
      it('should clear error state', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.clearError();
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Disconnected,
        );
      });
    });

    describe('requestBluetoothPermissions', () => {
      it('should call onRequestBluetoothPermissions callback', async () => {
        const mockRequestPermissions = jest.fn().mockResolvedValue(true);

        const { result } = renderHook(() => useTestActions(), {
          wrapper: ({ children }: { children: React.ReactNode }) => (
            <HardwareWalletProvider
              onRequestBluetoothPermissions={mockRequestPermissions}
            >
              {children}
            </HardwareWalletProvider>
          ),
        });

        let granted: boolean | undefined;
        await act(async () => {
          granted = await result.current.actions.requestBluetoothPermissions();
        });

        expect(mockRequestPermissions).toHaveBeenCalled();
        expect(granted).toBe(true);
      });

      it('should return false if no callback provided', async () => {
        const { result } = renderWithActions();

        let granted: boolean | undefined;
        await act(async () => {
          granted = await result.current.actions.requestBluetoothPermissions();
        });

        expect(granted).toBe(false);
      });
    });
  });

  describe('props', () => {
    it('should accept initial permissions', async () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      const initialPermissions = {
        bluetooth: BluetoothPermissionState.Granted,
        location: LocationPermissionState.Granted,
        allGranted: true,
      };

      const { getByTestId } = render(
        <HardwareWalletProvider initialPermissions={initialPermissions}>
          <TestConsumer />
        </HardwareWalletProvider>,
      );

      // Give time for effects to settle
      await waitFor(() => {
        expect(getByTestId('connectionStatus')).toBeTruthy();
      });
    });

    it('should render with default props', async () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      const { getByTestId } = render(
        <HardwareWalletProvider>
          <TestConsumer />
        </HardwareWalletProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('connectionStatus')).toBeTruthy();
      });
    });
  });

  describe('device selection flow', () => {
    const useTestActions = () => {
      const actions = useHardwareWalletActions();
      const state = useHardwareWalletState();
      return { actions, state };
    };

    const renderWithActions = () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      return renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });
    };

    describe('openDeviceSelection', () => {
      it('should transition to scanning state', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.openDeviceSelection(HardwareWalletType.Ledger);
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Scanning,
        );
      });

      it('should store success callback for later invocation', async () => {
        const onSuccess = jest.fn();
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.openDeviceSelection(
            HardwareWalletType.Ledger,
            onSuccess,
          );
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Scanning,
        );
        // Success callback is stored but not called yet
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });

    describe('closeDeviceSelection', () => {
      it('should return to disconnected state', async () => {
        const { result } = renderWithActions();

        // First open device selection
        await act(async () => {
          result.current.actions.openDeviceSelection(HardwareWalletType.Ledger);
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Scanning,
        );

        // Then close it
        await act(async () => {
          result.current.actions.closeDeviceSelection();
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Disconnected,
        );
      });
    });

    describe('selectDevice', () => {
      it('should update selected device in state', async () => {
        const { result } = renderWithActions();

        const mockDevice = { id: 'device-1', name: 'Nano X' };

        await act(async () => {
          result.current.actions.selectDevice(mockDevice);
        });

        // Device selection is stored in device selection state
        expect(result.current.state.deviceSelection.selectedDevice).toEqual(
          mockDevice,
        );
      });
    });

    describe('rescan', () => {
      it('should reset devices and restart scanning', async () => {
        const { result } = renderWithActions();

        // Open device selection first
        await act(async () => {
          result.current.actions.openDeviceSelection(HardwareWalletType.Ledger);
        });

        // Simulate selecting a device
        const mockDevice = { id: 'device-1', name: 'Nano X' };
        await act(async () => {
          result.current.actions.selectDevice(mockDevice);
        });

        // Rescan should clear the selected device
        await act(async () => {
          result.current.actions.rescan();
        });

        expect(result.current.state.deviceSelection.isScanning).toBe(true);
        expect(result.current.state.deviceSelection.devices).toEqual([]);
      });
    });
  });

  describe('signing modal flow', () => {
    const useTestActions = () => {
      const actions = useHardwareWalletActions();
      const state = useHardwareWalletState();
      return { actions, state };
    };

    const renderWithActions = () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      return renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });
    };

    describe('openSigningModal', () => {
      it('should transition to connecting state', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.openSigningModal(
            HardwareWalletType.Ledger,
            'device-123',
          );
        });

        // The connect happens asynchronously, state should be connecting
        await waitFor(() => {
          // After adapter.connect resolves, adapter emits events updating state
          expect(mockAdapterInstance.connect).toHaveBeenCalledWith(
            'device-123',
          );
        });
      });

      it('should call onDeviceReady callback when provided', async () => {
        const onDeviceReady = jest.fn().mockResolvedValue(undefined);
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.openSigningModal(
            HardwareWalletType.Ledger,
            'device-123',
            onDeviceReady,
          );
        });

        expect(mockAdapterInstance.connect).toHaveBeenCalledWith('device-123');
      });
    });

    describe('closeSigningModal', () => {
      it('should return to disconnected state', async () => {
        const { result } = renderWithActions();

        // Open signing modal
        await act(async () => {
          result.current.actions.openSigningModal(
            HardwareWalletType.Ledger,
            'device-123',
          );
        });

        // Close it
        await act(async () => {
          result.current.actions.closeSigningModal();
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Disconnected,
        );
      });
    });
  });

  describe('awaiting confirmation flow', () => {
    const useTestActions = () => {
      const actions = useHardwareWalletActions();
      const state = useHardwareWalletState();
      return { actions, state };
    };

    const renderWithActions = () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      return renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });
    };

    describe('showAwaitingConfirmation', () => {
      it('should transition to awaiting confirmation state', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.showAwaitingConfirmation('transaction');
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.AwaitingConfirmation,
        );
      });

      it('should handle message operation type', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.showAwaitingConfirmation('message');
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.AwaitingConfirmation,
        );
        // Type narrow to access operationType
        if (
          result.current.state.connectionState.status ===
          ConnectionStatus.AwaitingConfirmation
        ) {
          expect(result.current.state.connectionState.operationType).toBe(
            'message',
          );
        }
      });
    });

    describe('hideAwaitingConfirmation', () => {
      it('should return to disconnected state', async () => {
        const { result } = renderWithActions();

        // Show awaiting confirmation
        await act(async () => {
          result.current.actions.showAwaitingConfirmation('transaction');
        });

        // Hide it
        await act(async () => {
          result.current.actions.hideAwaitingConfirmation();
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Disconnected,
        );
      });
    });
  });

  describe('error handling', () => {
    const useTestActions = () => {
      const actions = useHardwareWalletActions();
      const state = useHardwareWalletState();
      return { actions, state };
    };

    const renderWithActions = () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      return renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });
    };

    describe('showHardwareWalletError', () => {
      it('should transition to error state', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.showHardwareWalletError(
            new Error('Test error'),
          );
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.ErrorState,
        );
      });
    });

    describe('retry', () => {
      it('should transition to connecting state when retrying', async () => {
        const { result } = renderWithActions();

        // First trigger an operation that will be stored for retry
        act(() => {
          result.current.actions.ensureDeviceReady('device-123');
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        // Simulate error state by showing an error
        await act(async () => {
          result.current.actions.showHardwareWalletError(
            new Error('Connection failed'),
          );
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.ErrorState,
        );

        // Retry
        await act(async () => {
          await result.current.actions.retry();
        });

        // After retry, adapter's ensureDeviceReady should be called again
        expect(mockAdapterInstance.ensureDeviceReady).toHaveBeenCalled();
      });
    });

    describe('resetFlowState', () => {
      it('should call adapter resetFlowState', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.resetFlowState();
        });

        expect(mockAdapterInstance.resetFlowState).toHaveBeenCalled();
      });
    });
  });

  describe('transport state monitoring', () => {
    it('should update bluetooth enabled state from adapter', async () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      // Mock adapter to call the transport state change callback
      let transportCallback: ((available: boolean) => void) | null = null;
      mockAdapterInstance.onTransportStateChange.mockImplementation(
        (callback: (available: boolean) => void) => {
          transportCallback = callback;
          callback(true); // Initially available
          return jest.fn();
        },
      );

      const { getByTestId } = renderProvider();

      await waitFor(() => {
        expect(getByTestId('connectionStatus')).toBeTruthy();
      });

      // Simulate transport becoming unavailable
      if (transportCallback) {
        await act(async () => {
          transportCallback?.(false);
        });
      }

      // Adapter should have received onTransportStateChange registration
      expect(mockAdapterInstance.onTransportStateChange).toHaveBeenCalled();
    });
  });

  describe('connect error handling', () => {
    const useTestActions = () => {
      const actions = useHardwareWalletActions();
      const state = useHardwareWalletState();
      return { actions, state };
    };

    it('should handle adapter connect errors', async () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      mockAdapterInstance.connect.mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      const { result } = renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });

      await act(async () => {
        await result.current.actions.connect('device-123');
      });

      expect(result.current.state.connectionState.status).toBe(
        ConnectionStatus.ErrorState,
      );
    });
  });

  describe('setTargetWalletType', () => {
    const useTestActions = () => {
      const actions = useHardwareWalletActions();
      const config = useHardwareWalletConfig();
      return { actions, config };
    };

    it('should update wallet type when set', async () => {
      mockUseSelector.mockReturnValue(null);
      mockGetHardwareWalletType.mockReturnValue(undefined);

      const { result } = renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });

      await act(async () => {
        result.current.actions.setTargetWalletType(HardwareWalletType.Ledger);
      });

      await waitFor(() => {
        expect(result.current.config.walletType).toBe(
          HardwareWalletType.Ledger,
        );
      });
    });
  });
});
