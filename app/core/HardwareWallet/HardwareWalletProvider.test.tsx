import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as reactRedux from 'react-redux';
import { HardwareWalletProvider } from './HardwareWalletProvider';
import {
  useHardwareWalletConfig,
  useHardwareWalletState,
  useHardwareWalletActions,
} from './contexts';
import { ConnectionStatus } from './connectionState';
import { HardwareWalletType } from './helpers';
import { BluetoothPermissionState, LocationPermissionState } from './types';

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
jest.mock('./adapters', () => ({
  createAdapter: jest.fn(() => ({
    walletType: 'Ledger',
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
  })),
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
    parseErrorByType: jest.fn((error: unknown) => {
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

import { getHardwareWalletTypeForAddress } from './helpers';
import { createAdapter } from './adapters';

describe('HardwareWalletProvider', () => {
  const mockUseSelector = reactRedux.useSelector as jest.MockedFunction<
    typeof reactRedux.useSelector
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
  ) => {
    return render(
      <HardwareWalletProvider {...props}>
        <TestConsumer />
      </HardwareWalletProvider>,
    );
  };

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

    it('should not create adapter for non-hardware accounts', () => {
      mockUseSelector.mockReturnValue({ address: '0xsoftware' });
      mockGetHardwareWalletType.mockReturnValue(undefined);

      renderProvider();

      expect(mockCreateAdapter).not.toHaveBeenCalled();
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
          <HardwareWalletProvider isBluetoothEnabled>
            {children}
          </HardwareWalletProvider>
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

      it('should fail if Bluetooth is disabled for Ledger', async () => {
        const { result } = renderHook(() => useTestActions(), {
          wrapper: ({ children }: { children: React.ReactNode }) => (
            <HardwareWalletProvider isBluetoothEnabled={false}>
              {children}
            </HardwareWalletProvider>
          ),
        });

        // Setup wallet type
        mockUseSelector.mockReturnValue({ address: '0x1234' });
        mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

        await act(async () => {
          await result.current.actions.connect('device-123');
        });

        // Connection should fail with error state
        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.ErrorState,
        );
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
      it('should check device readiness', async () => {
        const { result } = renderWithActions();

        let isReady: boolean | undefined;
        await act(async () => {
          isReady =
            await result.current.actions.ensureDeviceReady('device-123');
        });

        const adapter = mockCreateAdapter.mock.results[0]?.value;
        expect(adapter?.ensureDeviceReady).toHaveBeenCalledWith('device-123');
        expect(isReady).toBe(true);
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
              isBluetoothEnabled
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
    it('should accept initial permissions', () => {
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

      // Provider should render without errors
      expect(getByTestId('connectionStatus')).toBeTruthy();
    });

    it('should accept isBluetoothEnabled prop', () => {
      const { getByTestId } = render(
        <HardwareWalletProvider isBluetoothEnabled>
          <TestConsumer />
        </HardwareWalletProvider>,
      );

      expect(getByTestId('connectionStatus')).toBeTruthy();
    });
  });
});
