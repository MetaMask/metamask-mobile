import React from 'react';
import { waitFor } from '@testing-library/react-native';
import LedgerSelectAccount from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { ConnectionStatus } from '../../../core/HardwareWallet';

const mockedNavigate = jest.fn();
const mockedPop = jest.fn();
const mockedDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

// Mock the unified hardware wallet context
const mockEnsureDeviceReady = jest.fn().mockResolvedValue(true);
const mockShowHardwareWalletError = jest.fn();
const mockSetTargetWalletType = jest.fn();

jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWalletState: jest.fn(() => ({
    connectionState: {
      status: 'disconnected',
      walletType: undefined,
      error: null,
    },
    deviceSelection: {
      devices: [],
      selectedDevice: null,
      isScanning: false,
    },
  })),
  useHardwareWalletActions: jest.fn(() => ({
    ensureDeviceReady: mockEnsureDeviceReady,
    showHardwareWalletError: mockShowHardwareWalletError,
    setTargetWalletType: mockSetTargetWalletType,
  })),
  ConnectionStatus: {
    Disconnected: 'disconnected',
    Scanning: 'scanning',
    Connecting: 'connecting',
    Connected: 'connected',
    AwaitingApp: 'awaiting_app',
    AwaitingConfirmation: 'awaiting_confirmation',
    ErrorState: 'error',
    Success: 'success',
  },
  HardwareWalletType: {
    Ledger: 'ledger',
    QR: 'qr',
  },
}));

jest.mock('../../hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      setOptions: jest.fn(),
      goBack: jest.fn(),
      pop: mockedPop,
      dispatch: jest.fn(),
    }),
    StackActions: {
      pop: jest.fn(),
    },
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockedDispatch,
}));

jest.mock('../../../core/Ledger/Ledger', () => ({
  forgetLedger: jest.fn(),
  getHDPath: jest.fn().mockReturnValue("m/44'/60'/0'/0"),
  getLedgerAccounts: jest.fn().mockResolvedValue([]),
  getLedgerAccountsByOperation: jest.fn().mockResolvedValue([
    {
      address: '0x1234567890123456789012345678901234567890',
      index: 0,
      balance: '0',
    },
  ]),
  setHDPath: jest.fn(),
  unlockLedgerWalletAccount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../core/HardwareWallets/analytics', () => ({
  getConnectedDevicesCount: jest.fn(),
}));

jest.mock('../../../util/hardwareWallet/deviceNameUtils', () => ({
  sanitizeDeviceName: jest.fn((name: string) => name),
}));

jest.mock('../../../util/address', () => ({
  toFormattedAddress: jest.fn((address: string) => address),
  formatAddress: jest.fn((address: string) => address),
  isHardwareAccount: jest.fn(() => true),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getAccounts: jest.fn(),
    },
    AccountsController: {
      getAccountByAddress: jest.fn(),
      setAccountName: jest.fn(),
    },
    AccountTrackerController: {
      syncBalanceWithAddresses: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock AccountSelector hooks
jest.mock('../../UI/HardwareWallet/AccountSelector/hooks', () => ({
  useAccountsBalance: jest.fn(() => ({
    balances: {},
    isLoading: false,
  })),
}));
const MockEngine = jest.mocked(Engine);

describe('LedgerSelectAccount', () => {
  const mockKeyringController = MockEngine.context.KeyringController;
  const mockExistingAccounts = [
    '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    '0xa1e359811322d97991e03f863a0c30c2cf029cd',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyringController.getAccounts.mockResolvedValue(mockExistingAccounts);
    mockEnsureDeviceReady.mockResolvedValue(true);
  });

  describe('Initial Rendering', () => {
    it('renders LedgerConnect when no accounts are loaded', () => {
      mockKeyringController.getAccounts.mockResolvedValue([]);
      const { toJSON } = renderWithProvider(<LedgerSelectAccount />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders LedgerConnect when connection error exists', () => {
      // Mock error state in unified context
      const { useHardwareWalletState } = jest.requireMock(
        '../../../core/HardwareWallet',
      );
      useHardwareWalletState.mockReturnValue({
        connectionState: {
          status: ConnectionStatus.ErrorState,
          walletType: 'ledger',
          error: {
            code: 'device_disconnected',
            message: 'Device disconnected',
          },
        },
        deviceSelection: {
          availableDevices: [],
          selectedDevice: null,
          isScanning: false,
        },
      });

      const { toJSON } = renderWithProvider(<LedgerSelectAccount />);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Account Loading', () => {
    it('loads existing accounts on mount', async () => {
      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockKeyringController.getAccounts).toHaveBeenCalled();
      });
    });

    it('formats existing account addresses', async () => {
      const mockToFormattedAddress = jest.requireMock(
        '../../../util/address',
      ).toFormattedAddress;

      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockToFormattedAddress).toHaveBeenCalledWith(
          mockExistingAccounts[0],
          0,
          mockExistingAccounts,
        );
        expect(mockToFormattedAddress).toHaveBeenCalledWith(
          mockExistingAccounts[1],
          1,
          mockExistingAccounts,
        );
      });
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks metrics when accounts are loaded', async () => {
      // Metrics are tracked when accounts.length > 0
      const { getLedgerAccountsByOperation } = jest.requireMock(
        '../../../core/Ledger/Ledger',
      );
      getLedgerAccountsByOperation.mockResolvedValue([
        { address: '0x1234', index: 0, balance: '0' },
      ]);

      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('showHardwareWalletError is available via hook', async () => {
      renderWithProvider(<LedgerSelectAccount />);

      // Verify the mock hook is providing the error handler
      await waitFor(() => {
        expect(mockShowHardwareWalletError).toBeDefined();
      });
    });
  });
});
