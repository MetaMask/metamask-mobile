import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { HardwareWalletProvider } from './HardwareWalletProvider';
import { useHardwareWallet } from './contexts';
import { getHardwareWalletTypeForAddress } from './helpers';
import { createAdapter } from './adapters';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./helpers', () => ({
  ...jest.requireActual('./helpers'),
  getHardwareWalletTypeForAddress: jest.fn(),
}));

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
  getTransportDisabledErrorCode: jest.fn().mockReturnValue('BluetoothDisabled'),
  getConnectionTips: jest
    .fn()
    .mockReturnValue([
      'hardware_wallet.connecting.tip_unlock',
      'hardware_wallet.connecting.tip_open_app',
      'hardware_wallet.connecting.tip_enable_bluetooth',
      'hardware_wallet.connecting.tip_dnd_off',
    ]),
};

jest.mock('./adapters', () => ({
  createAdapter: jest.fn(() => mockAdapterInstance),
}));

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

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Capture bottom sheet props so we can invoke internal actions in tests
let capturedBottomSheetProps: Record<string, unknown> = {};
jest.mock('./components', () => ({
  HardwareWalletBottomSheet: (props: Record<string, unknown>) => {
    capturedBottomSheetProps = props;
    return null;
  },
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
    capturedBottomSheetProps = {};
    // Default: non-hardware wallet account
    mockUseSelector.mockReturnValue(null);
    mockGetHardwareWalletType.mockReturnValue(undefined);
  });

  const TestConsumer: React.FC = () => {
    const { walletType, connectionState, ensureDeviceReady } =
      useHardwareWallet();
    return (
      <>
        <Text testID="walletType">{walletType ?? 'null'}</Text>
        <Text testID="connectionStatus">{connectionState.status}</Text>
        <Text testID="hasEnsureDeviceReady">
          {String(typeof ensureDeviceReady === 'function')}
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
    it('provides config context', () => {
      const { getByTestId } = renderProvider();

      expect(getByTestId('walletType').children[0]).toBe('null');
    });

    it('provides state context', () => {
      const { getByTestId } = renderProvider();

      expect(getByTestId('connectionStatus').children[0]).toBe(
        ConnectionStatus.Disconnected,
      );
    });

    it('provides actions context', () => {
      const { getByTestId } = renderProvider();

      expect(getByTestId('hasEnsureDeviceReady').children[0]).toBe('true');
    });
  });

  describe('wallet type detection', () => {
    it('detects hardware wallet from selected account', async () => {
      const mockAccount = { address: '0x1234' };
      mockUseSelector.mockReturnValue(mockAccount);
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      const { getByTestId } = renderProvider();

      await waitFor(() => {
        expect(getByTestId('walletType').children[0]).toBe(
          HardwareWalletType.Ledger,
        );
      });
    });

    it('identifies non-hardware accounts', () => {
      mockUseSelector.mockReturnValue({ address: '0xsoftware' });
      mockGetHardwareWalletType.mockReturnValue(undefined);

      const { getByTestId } = renderProvider();

      expect(getByTestId('walletType').children[0]).toBe('null');
    });
  });

  describe('adapter creation', () => {
    it('creates adapter when wallet type is set', async () => {
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

    it('creates non-hardware adapter for non-hardware accounts', () => {
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
      const hw = useHardwareWallet();
      return {
        actions: hw,
        state: {
          connectionState: hw.connectionState,
          deviceSelection: hw.deviceSelection,
        },
      };
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

    describe('connect (internal, via bottom sheet props)', () => {
      it('connects to device', async () => {
        renderWithActions();

        const internalConnect = capturedBottomSheetProps.connect as (
          deviceId: string,
        ) => Promise<void>;
        expect(internalConnect).toBeDefined();

        await act(async () => {
          await internalConnect('device-123');
        });

        const adapter = mockCreateAdapter.mock.results[0]?.value;
        expect(adapter?.connect).toHaveBeenCalledWith('device-123');
      });
    });

    describe('ensureDeviceReady', () => {
      it('starts the device readiness flow', async () => {
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
  });

  describe('props', () => {
    it('renders with default props', async () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      const { getByTestId } = render(
        <HardwareWalletProvider>
          <TestConsumer />
        </HardwareWalletProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('connectionStatus')).toBeOnTheScreen();
      });
    });
  });

  describe('device selection flow (internal actions via bottom sheet props)', () => {
    const useTestActions = () => {
      const hw = useHardwareWallet();
      return {
        actions: hw,
        state: {
          connectionState: hw.connectionState,
          deviceSelection: hw.deviceSelection,
        },
      };
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

    describe('closeDeviceSelection', () => {
      it('returns to disconnected state', async () => {
        const { result } = renderWithActions();

        act(() => {
          result.current.actions.ensureDeviceReady();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Scanning,
        );

        const internalClose =
          capturedBottomSheetProps.closeDeviceSelection as () => void;
        await act(async () => {
          internalClose();
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Disconnected,
        );
      });
    });

    describe('selectDevice', () => {
      it('updates selected device in state', async () => {
        const { result } = renderWithActions();

        const mockDevice = { id: 'device-1', name: 'Nano X' };

        const internalSelectDevice =
          capturedBottomSheetProps.selectDevice as (device: {
            id: string;
            name: string;
          }) => void;

        await act(async () => {
          internalSelectDevice(mockDevice);
        });

        expect(result.current.state.deviceSelection.selectedDevice).toEqual(
          mockDevice,
        );
      });
    });

    describe('rescan', () => {
      it('resets devices and restarts scanning', async () => {
        const { result } = renderWithActions();

        act(() => {
          result.current.actions.ensureDeviceReady();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        const internalSelectDevice =
          capturedBottomSheetProps.selectDevice as (device: {
            id: string;
            name: string;
          }) => void;
        const internalRescan = capturedBottomSheetProps.rescan as () => void;

        const mockDevice = { id: 'device-1', name: 'Nano X' };
        await act(async () => {
          internalSelectDevice(mockDevice);
        });

        await act(async () => {
          internalRescan();
        });

        expect(result.current.state.deviceSelection.isScanning).toBe(true);
        expect(result.current.state.deviceSelection.devices).toEqual([]);
      });
    });
  });

  describe('awaiting confirmation flow', () => {
    const useTestActions = () => {
      const hw = useHardwareWallet();
      return {
        actions: hw,
        state: {
          connectionState: hw.connectionState,
          deviceSelection: hw.deviceSelection,
        },
      };
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
      it('transitions to awaiting confirmation state', async () => {
        const { result } = renderWithActions();

        await act(async () => {
          result.current.actions.showAwaitingConfirmation('transaction');
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.AwaitingConfirmation,
        );
      });

      it('handles message operation type', async () => {
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
      it('returns to disconnected state', async () => {
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
      const hw = useHardwareWallet();
      return {
        actions: hw,
        state: {
          connectionState: hw.connectionState,
          deviceSelection: hw.deviceSelection,
        },
      };
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
      it('transitions to error state', async () => {
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

    describe('retryLastOperation (internal, via bottom sheet props)', () => {
      it('transitions to connecting state when retrying', async () => {
        const { result } = renderWithActions();

        act(() => {
          result.current.actions.ensureDeviceReady('device-123');
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        await act(async () => {
          result.current.actions.showHardwareWalletError(
            new Error('Connection failed'),
          );
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.ErrorState,
        );

        const internalRetry =
          capturedBottomSheetProps.retryLastOperation as () => Promise<void>;
        await act(async () => {
          await internalRetry();
        });

        expect(mockAdapterInstance.ensureDeviceReady).toHaveBeenCalled();
      });
    });
  });

  describe('transport state monitoring', () => {
    it('updates bluetooth enabled state from adapter', async () => {
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
        expect(getByTestId('connectionStatus')).toBeOnTheScreen();
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

  describe('connect error handling (internal, via bottom sheet props)', () => {
    it('handles adapter connect errors', async () => {
      mockUseSelector.mockReturnValue({ address: '0x1234' });
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      mockAdapterInstance.connect.mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      const useTestActions = () => {
        const hw = useHardwareWallet();
        return {
          state: {
            connectionState: hw.connectionState,
          },
        };
      };

      const { result } = renderHook(() => useTestActions(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <HardwareWalletProvider>{children}</HardwareWalletProvider>
        ),
      });

      const internalConnect = capturedBottomSheetProps.connect as (
        deviceId: string,
      ) => Promise<void>;

      await act(async () => {
        await internalConnect('device-123');
      });

      expect(result.current.state.connectionState.status).toBe(
        ConnectionStatus.ErrorState,
      );
    });
  });

  describe('setTargetWalletType', () => {
    const useTestActions = () => {
      const hw = useHardwareWallet();
      return {
        actions: hw,
        config: { walletType: hw.walletType, deviceId: hw.deviceId },
      };
    };

    it('updates wallet type when set', async () => {
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
