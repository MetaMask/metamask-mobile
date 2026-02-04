import React from 'react';
import { waitFor } from '@testing-library/react-native';
import LedgerSelectAccount from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { LedgerCommunicationErrors } from '../../../core/Ledger/ledgerErrors';

const mockedNavigate = jest.fn();
const mockedPop = jest.fn();
const mockedDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../hooks/Ledger/useLedgerBluetooth', () => ({
  __esModule: true,
  default: jest.fn((_deviceId?: string) => ({
    isSendingLedgerCommands: false,
    isAppLaunchConfirmationNeeded: false,
    ledgerLogicToRun: jest.fn(),
    error: undefined,
  })),
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
  getHDPath: jest.fn(),
  getLedgerAccounts: jest.fn(),
  getLedgerAccountsByOperation: jest.fn(),
  setHDPath: jest.fn(),
  unlockLedgerWalletAccount: jest.fn(),
}));

jest.mock('../../../core/HardwareWallets/analytics', () => ({
  getConnectedDevicesCount: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../../util/hardwareWallet/deviceNameUtils', () => ({
  sanitizeDeviceName: jest.fn((name: string) => name),
}));

jest.mock('../../../util/address', () => ({
  toFormattedAddress: jest.fn((address: string) => address),
  formatAddress: jest.fn((address: string) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '',
  ),
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
  },
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

    (
      useLedgerBluetooth as unknown as jest.MockedFunction<
        typeof useLedgerBluetooth
      >
    ).mockImplementation(() => ({
      isSendingLedgerCommands: false,
      isAppLaunchConfirmationNeeded: false,
      ledgerLogicToRun: jest.fn(),
      error: undefined,
      cleanupBluetoothConnection: jest.fn(),
    }));
  });

  describe('Initial Rendering', () => {
    it('renders LedgerConnect when no accounts are loaded', () => {
      mockKeyringController.getAccounts.mockResolvedValue([]);
      const { toJSON } = renderWithProvider(<LedgerSelectAccount />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders LedgerConnect when ledger error exists', () => {
      (
        useLedgerBluetooth as unknown as jest.MockedFunction<
          typeof useLedgerBluetooth
        >
      ).mockImplementation(() => ({
        isSendingLedgerCommands: false,
        isAppLaunchConfirmationNeeded: false,
        ledgerLogicToRun: jest.fn(),
        error: LedgerCommunicationErrors.LedgerDisconnected,
        cleanupBluetoothConnection: jest.fn(),
      }));

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
    it('tracks metrics when rendering with LedgerConnect', () => {
      mockKeyringController.getAccounts.mockResolvedValue([]);

      renderWithProvider(<LedgerSelectAccount />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('includes hardware device type when tracking hardware wallet instructions', () => {
      mockKeyringController.getAccounts.mockResolvedValue([]);
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({ event: 'instructions_viewed' }),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      renderWithProvider(<LedgerSelectAccount />);

      expect(mockBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: HardwareDeviceTypes.LEDGER,
        }),
      );
    });

    it('calls trackEvent with built event object', () => {
      mockKeyringController.getAccounts.mockResolvedValue([]);
      const mockEvent = { event: 'test_event' };
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockEvent),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      renderWithProvider(<LedgerSelectAccount />);

      expect(mockTrackEvent).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('Error Handling', () => {
    it('hides blocking modal when ledger error occurs', async () => {
      const { rerender } = renderWithProvider(<LedgerSelectAccount />);

      (
        useLedgerBluetooth as unknown as jest.MockedFunction<
          typeof useLedgerBluetooth
        >
      ).mockImplementation(() => ({
        isSendingLedgerCommands: false,
        isAppLaunchConfirmationNeeded: false,
        ledgerLogicToRun: jest.fn(),
        error: LedgerCommunicationErrors.LedgerDisconnected,
        cleanupBluetoothConnection: jest.fn(),
      }));

      rerender(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(useLedgerBluetooth).toHaveBeenCalled();
      });
    });
  });

  describe('getDisplayErrorMessage', () => {
    it('renders LedgerConnect when EthAppNotOpen error occurs', () => {
      (
        useLedgerBluetooth as unknown as jest.MockedFunction<
          typeof useLedgerBluetooth
        >
      ).mockImplementation(() => ({
        isSendingLedgerCommands: false,
        isAppLaunchConfirmationNeeded: false,
        ledgerLogicToRun: jest.fn(),
        error: LedgerCommunicationErrors.EthAppNotOpen,
        cleanupBluetoothConnection: jest.fn(),
      }));

      const { toJSON } = renderWithProvider(<LedgerSelectAccount />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('displays EthAppNotOpen error message when error occurs', () => {
      (
        useLedgerBluetooth as unknown as jest.MockedFunction<
          typeof useLedgerBluetooth
        >
      ).mockImplementation(() => ({
        isSendingLedgerCommands: false,
        isAppLaunchConfirmationNeeded: false,
        ledgerLogicToRun: jest.fn(),
        error: LedgerCommunicationErrors.EthAppNotOpen,
        cleanupBluetoothConnection: jest.fn(),
      }));

      const { getByText } = renderWithProvider(<LedgerSelectAccount />);

      // When EthAppNotOpen error occurs, the error message should be displayed
      expect(getByText('Ethereum app not open')).toBeTruthy();
      expect(
        getByText('Please open the Ethereum app on your Ledger device.'),
      ).toBeTruthy();
    });
  });
});
