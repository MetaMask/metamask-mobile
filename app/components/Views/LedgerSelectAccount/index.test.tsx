import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import LedgerSelectAccount from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import {
  getLedgerAccountsByOperation,
  unlockLedgerWalletAccount,
  forgetLedger,
  getHDPath,
  getLedgerAccounts,
  setHDPath,
} from '../../../core/Ledger/Ledger';
import { getConnectedDevicesCount } from '../../../core/HardwareWallets/analytics';
import PAGINATION_OPERATIONS from '../../../constants/pagination';
import {
  LEDGER_BIP44_PATH,
  LEDGER_LEGACY_PATH,
  LEDGER_LIVE_PATH,
} from '../../../core/Ledger/constants';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  ACCOUNT_SELECTOR_FORGET_BUTTON,
  ACCOUNT_SELECTOR_NEXT_BUTTON,
  ACCOUNT_SELECTOR_PREVIOUS_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Components/AccountSelector.testIds';
import { SELECT_DROP_DOWN } from '../../UI/SelectOptionSheet/constants';
import { useHardwareWallet } from '../../../core/HardwareWallet';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';

const mockedGoBack = jest.fn();
const mockedNavDispatch = jest.fn();
const mockedDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

const mockEnsureDeviceReady = jest.fn().mockResolvedValue(true);
const mockSetTargetWalletType = jest.fn();
const mockShowHardwareWalletError = jest.fn();

const mockShowAwaitingConfirmation = jest.fn();
const mockHideAwaitingConfirmation = jest.fn();

jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(),
}));
const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: mockedGoBack,
      pop: jest.fn(),
      dispatch: mockedNavDispatch,
    }),
    StackActions: {
      pop: jest.fn().mockReturnValue({ type: 'POP', payload: { count: 2 } }),
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
      state: { keyrings: [] },
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
const MockEngine = jest.mocked(Engine);

const mockGetLedgerAccountsByOperation =
  getLedgerAccountsByOperation as jest.Mock;
const mockUnlockLedgerWalletAccount = unlockLedgerWalletAccount as jest.Mock;
const mockForgetLedger = forgetLedger as jest.Mock;
const mockGetHDPath = getHDPath as jest.Mock;
const mockGetLedgerAccounts = getLedgerAccounts as jest.Mock;
const mockSetHDPath = setHDPath as jest.Mock;
const mockGetConnectedDevicesCount = getConnectedDevicesCount as jest.Mock;

const mockAccounts = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    index: 0,
    balance: '1.5',
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    index: 1,
    balance: '2.0',
  },
  {
    address: '0x567890abcdef1234567890abcdef123456789012',
    index: 2,
    balance: '0.5',
  },
];

const defaultHardwareWalletValues = {
  walletType: HardwareWalletType.Ledger as HardwareWalletType | null,
  deviceId: 'test-device-id',
  connectionState: {
    status: ConnectionStatus.Disconnected as const,
  },
  deviceSelection: {
    devices: [],
    selectedDevice: { id: 'test-device-id', name: 'Nano X' },
    isScanning: false,
    scanError: null,
  },
  ensureDeviceReady: mockEnsureDeviceReady,
  setTargetWalletType: mockSetTargetWalletType,
  showHardwareWalletError: mockShowHardwareWalletError,
  showAwaitingConfirmation: mockShowAwaitingConfirmation,
  hideAwaitingConfirmation: mockHideAwaitingConfirmation,
};

describe('LedgerSelectAccount', () => {
  const mockKeyringController = MockEngine.context.KeyringController;
  const mockAccountsController = MockEngine.context.AccountsController;
  const mockExistingAccounts = [
    '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    '0xa1e359811322d97991e03f863a0c30c2cf029cd',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyringController.getAccounts.mockResolvedValue(mockExistingAccounts);
    mockGetLedgerAccountsByOperation.mockResolvedValue([]);
    mockGetConnectedDevicesCount.mockResolvedValue(1);
    mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
    mockGetLedgerAccounts.mockResolvedValue([]);
    mockSetHDPath.mockResolvedValue(undefined);
    mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
    mockForgetLedger.mockResolvedValue(undefined);

    mockEnsureDeviceReady.mockResolvedValue(true);

    mockUseHardwareWallet.mockReturnValue({ ...defaultHardwareWalletValues });
  });

  /**
   * Render the component and wait for `ensureDeviceReady` to resolve and
   * accounts to be fetched so the AccountSelector view is visible.
   */
  const renderAndWaitForAccounts = async () => {
    mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);
    const result = renderWithProvider(<LedgerSelectAccount />);

    await waitFor(() => {
      expect(result.queryByText('Select an account')).toBeOnTheScreen();
    });

    return result;
  };

  describe('Initial Rendering', () => {
    it('shows loading indicator while waiting for device readiness', () => {
      mockEnsureDeviceReady.mockReturnValue(new Promise(() => undefined));
      const { queryByText } = renderWithProvider(<LedgerSelectAccount />);

      expect(queryByText('Looking for device')).toBeOnTheScreen();
    });

    it('sets target wallet type to Ledger on mount', async () => {
      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockSetTargetWalletType).toHaveBeenCalledWith(
          HardwareWalletType.Ledger,
        );
      });
    });

    it('calls ensureDeviceReady on mount', async () => {
      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockEnsureDeviceReady).toHaveBeenCalled();
      });
    });

    it('navigates back when user cancels (ensureDeviceReady returns false)', async () => {
      mockEnsureDeviceReady.mockResolvedValue(false);

      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockedGoBack).toHaveBeenCalled();
      });
    });

    it('navigates back when ensureDeviceReady throws on mount', async () => {
      mockEnsureDeviceReady.mockRejectedValue(
        new Error('Bluetooth adapter failed'),
      );

      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockedGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('Account Loading', () => {
    it('loads existing accounts from KeyringController on mount', async () => {
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

    it('fetches accounts after device is ready', async () => {
      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockGetLedgerAccountsByOperation).toHaveBeenCalledWith(
          PAGINATION_OPERATIONS.GET_FIRST_PAGE,
        );
      });
    });

    it('renders account selector after accounts are loaded', async () => {
      const { queryByText } = await renderAndWaitForAccounts();

      expect(queryByText('Select an account')).toBeOnTheScreen();
      expect(queryByText('Select HD Path')).toBeOnTheScreen();
    });

    it('shows inline error when account fetching fails', async () => {
      mockGetLedgerAccountsByOperation.mockRejectedValue(
        new Error('Fetch failed'),
      );

      const { queryByText } = renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(queryByText('Fetch failed')).toBeOnTheScreen();
      });
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks account selector open event when accounts are loaded', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      await renderAndWaitForAccounts();

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ACCOUNT_SELECTOR_OPEN,
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith({
          device_type: HardwareDeviceTypes.LEDGER,
          device_model: 'Nano X',
        });
      });
    });
  });

  describe('Account Selector View', () => {
    it('renders account selector with correct elements', async () => {
      const { queryByText, getByTestId } = await renderAndWaitForAccounts();

      expect(queryByText('Select an account')).toBeOnTheScreen();
      expect(queryByText('Select HD Path')).toBeOnTheScreen();
      expect(getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(ACCOUNT_SELECTOR_PREVIOUS_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON)).toBeOnTheScreen();
    });

    it('displays HD path selector dropdown', async () => {
      const { getByTestId } = await renderAndWaitForAccounts();

      expect(getByTestId(SELECT_DROP_DOWN)).toBeOnTheScreen();
    });
  });

  describe('Pagination', () => {
    it('fetches next page of accounts', async () => {
      const { getByTestId } = await renderAndWaitForAccounts();

      mockGetLedgerAccountsByOperation.mockClear();
      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON));
      });

      await waitFor(() => {
        expect(mockGetLedgerAccountsByOperation).toHaveBeenCalledWith(
          PAGINATION_OPERATIONS.GET_NEXT_PAGE,
        );
      });
    });

    it('fetches previous page of accounts', async () => {
      const { getByTestId } = await renderAndWaitForAccounts();

      mockGetLedgerAccountsByOperation.mockClear();
      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_PREVIOUS_BUTTON));
      });

      await waitFor(() => {
        expect(mockGetLedgerAccountsByOperation).toHaveBeenCalledWith(
          PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
        );
      });
    });

    it('shows inline error on pagination error', async () => {
      const { getByTestId, queryByText } = await renderAndWaitForAccounts();

      mockGetLedgerAccountsByOperation.mockClear();
      mockGetLedgerAccountsByOperation.mockRejectedValueOnce(
        new Error('Pagination failed'),
      );

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON));
      });

      await waitFor(() => {
        expect(queryByText('Pagination failed')).toBeOnTheScreen();
      });
    });

    it('shows blocking modal during pagination', async () => {
      const { getByTestId, queryByText } = await renderAndWaitForAccounts();

      let resolvePromise: ((value: unknown) => void) | undefined;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetLedgerAccountsByOperation.mockReturnValue(slowPromise);

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON));
      });

      expect(queryByText('Please wait')).toBeOnTheScreen();

      await act(async () => {
        resolvePromise?.(mockAccounts);
      });
    });
  });

  describe('onUnlock', () => {
    const selectFirstAccountAndUnlock = async (
      result: ReturnType<typeof renderWithProvider>,
    ) => {
      const checkboxes = result.getAllByRole('checkbox');
      await act(async () => {
        fireEvent(checkboxes[0], 'valueChange', true);
      });
      await act(async () => {
        fireEvent.press(result.getByText('Unlock'));
      });
    };

    it('unlocks selected accounts and navigates back on success', async () => {
      mockGetConnectedDevicesCount.mockResolvedValue(2);
      mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
      mockGetLedgerAccounts.mockResolvedValue([]);

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(mockEnsureDeviceReady).toHaveBeenCalledWith('test-device-id');
        expect(mockUnlockLedgerWalletAccount).toHaveBeenCalledWith(0);
        expect(mockedNavDispatch).toHaveBeenCalled();
      });
    });

    it('does nothing when ensureDeviceReady returns false', async () => {
      mockEnsureDeviceReady
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(mockUnlockLedgerWalletAccount).not.toHaveBeenCalled();
      });
    });

    it('shows inline error when ensureDeviceReady throws during unlock', async () => {
      mockEnsureDeviceReady
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Transport disconnected'));

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(result.queryByText('Transport disconnected')).toBeOnTheScreen();
      });
    });

    it('shows inline error on unlock failure', async () => {
      mockUnlockLedgerWalletAccount.mockRejectedValueOnce(
        new Error('Unlock failed'),
      );

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(result.queryByText('Unlock failed')).toBeOnTheScreen();
      });
    });

    it('tracks error analytics on unlock failure', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);
      mockUnlockLedgerWalletAccount.mockRejectedValueOnce(new Error('0x6d00'));

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({ error: '0x6d00' }),
        );
      });
    });

    it('tracks add-account analytics on success', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);
      mockGetConnectedDevicesCount.mockResolvedValue(3);
      mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
      mockGetLedgerAccounts.mockResolvedValue([]);

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ADD_ACCOUNT,
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            device_type: HardwareDeviceTypes.LEDGER,
            hd_path: expect.any(String),
            connected_device_count: '3',
          }),
        );
      });
    });
  });

  describe('onForget', () => {
    it('shows blocking modal when forget button is pressed', async () => {
      const { getByTestId, queryByText } = await renderAndWaitForAccounts();

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      await waitFor(() => {
        expect(queryByText('Please wait')).toBeOnTheScreen();
      });
    });
  });

  describe('onAnimationCompleted', () => {
    it('does not call forgetLedger when blocking modal is not visible', async () => {
      renderWithProvider(<LedgerSelectAccount />);

      await waitFor(() => {
        expect(mockKeyringController.getAccounts).toHaveBeenCalled();
      });

      expect(mockForgetLedger).not.toHaveBeenCalled();
    });
  });

  describe('updateNewLegacyAccountsLabel', () => {
    const selectFirstAccountAndUnlock = async (
      result: ReturnType<typeof renderWithProvider>,
    ) => {
      const checkboxes = result.getAllByRole('checkbox');
      await act(async () => {
        fireEvent(checkboxes[0], 'valueChange', true);
      });
      await act(async () => {
        fireEvent.press(result.getByText('Unlock'));
      });
    };

    it('appends legacy label to new accounts when on legacy path', async () => {
      mockGetHDPath.mockResolvedValue(LEDGER_LEGACY_PATH);
      const newAccount = '0xnewaccount1234567890abcdef1234567890abcdef';
      const newAccountName = 'Ledger 1';

      mockGetLedgerAccounts.mockResolvedValue([newAccount]);
      (mockAccountsController.getAccountByAddress as jest.Mock).mockReturnValue(
        {
          id: 'account-id',
          metadata: { name: newAccountName },
        },
      );

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(mockAccountsController.setAccountName).toHaveBeenCalledWith(
          'account-id',
          expect.stringContaining(newAccountName),
        );
      });
    });

    it('does not update labels for non-legacy paths', async () => {
      mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
      mockGetLedgerAccounts.mockResolvedValue([]);

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(mockUnlockLedgerWalletAccount).toHaveBeenCalled();
      });

      expect(mockAccountsController.setAccountName).not.toHaveBeenCalled();
    });

    it('skips accounts not found in AccountsController', async () => {
      mockGetHDPath.mockResolvedValue(LEDGER_LEGACY_PATH);
      const newAccount = '0xnewaccount1234567890abcdef1234567890abcdef';
      mockGetLedgerAccounts.mockResolvedValue([newAccount]);
      (mockAccountsController.getAccountByAddress as jest.Mock).mockReturnValue(
        undefined,
      );

      const result = await renderAndWaitForAccounts();

      await selectFirstAccountAndUnlock(result);

      await waitFor(() => {
        expect(mockUnlockLedgerWalletAccount).toHaveBeenCalled();
      });

      expect(mockAccountsController.setAccountName).not.toHaveBeenCalled();
    });
  });

  describe('getPathString', () => {
    it('correctly maps Ledger Live path constant', () => {
      expect(LEDGER_LIVE_PATH).toBe("m/44'/60'/0'/0/0");
    });

    it('correctly maps Ledger Legacy path constant', () => {
      expect(LEDGER_LEGACY_PATH).toBe("m/44'/60'/0'");
    });

    it('correctly maps Ledger BIP44 path constant', () => {
      expect(LEDGER_BIP44_PATH).toBe("m/44'/60'/0'/0");
    });
  });

  describe('ledgerModelName', () => {
    it('derives model name from selectedDevice via sanitizeDeviceName', async () => {
      const { sanitizeDeviceName } = jest.requireMock(
        '../../../util/hardwareWallet/deviceNameUtils',
      );

      await renderAndWaitForAccounts();

      expect(sanitizeDeviceName).toHaveBeenCalledWith('Nano X');
    });

    it('returns undefined when no device is selected', () => {
      mockUseHardwareWallet.mockReturnValue({
        ...defaultHardwareWalletValues,
        deviceSelection: {
          devices: [],
          selectedDevice: null,
          isScanning: false,
          scanError: null,
        },
      });

      const { sanitizeDeviceName } = jest.requireMock(
        '../../../util/hardwareWallet/deviceNameUtils',
      );
      sanitizeDeviceName.mockClear();

      renderWithProvider(<LedgerSelectAccount />);

      expect(sanitizeDeviceName).not.toHaveBeenCalled();
    });

    it('includes model name in analytics events', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      await renderAndWaitForAccounts();

      expect(mockBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          device_model: 'Nano X',
        }),
      );
    });
  });

  describe('Pagination Operations', () => {
    it('uses correct pagination operations for next and previous', async () => {
      const { getByTestId } = await renderAndWaitForAccounts();

      mockGetLedgerAccountsByOperation.mockClear();
      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON));
      });

      expect(mockGetLedgerAccountsByOperation).toHaveBeenCalledWith(
        PAGINATION_OPERATIONS.GET_NEXT_PAGE,
      );

      mockGetLedgerAccountsByOperation.mockClear();
      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_PREVIOUS_BUTTON));
      });

      expect(mockGetLedgerAccountsByOperation).toHaveBeenCalledWith(
        PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
      );
    });
  });

  describe('Forget Ledger Flow', () => {
    it('triggers forget flow when forget button is pressed', async () => {
      const { getByTestId, queryByText } = await renderAndWaitForAccounts();

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      await waitFor(() => {
        expect(queryByText('Please wait')).toBeOnTheScreen();
      });
    });
  });

  describe('Blocking Modal', () => {
    it('renders blocking modal with correct children', async () => {
      const { getByTestId, queryByText } = await renderAndWaitForAccounts();

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      expect(queryByText('Please wait')).toBeOnTheScreen();
    });
  });

  describe('Error Handling during pagination', () => {
    it('shows inline error on nextPage error', async () => {
      const { getByTestId, queryByText } = await renderAndWaitForAccounts();

      mockGetLedgerAccountsByOperation.mockClear();
      mockGetLedgerAccountsByOperation.mockRejectedValueOnce(
        new Error('Test error'),
      );

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON));
      });

      await waitFor(() => {
        expect(queryByText('Test error')).toBeOnTheScreen();
      });
    });

    it('shows inline error on prevPage error', async () => {
      const { getByTestId, queryByText } = await renderAndWaitForAccounts();

      mockGetLedgerAccountsByOperation.mockClear();
      mockGetLedgerAccountsByOperation.mockRejectedValueOnce(
        new Error('Network error'),
      );

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_PREVIOUS_BUTTON));
      });

      await waitFor(() => {
        expect(queryByText('Network error')).toBeOnTheScreen();
      });
    });
  });
});
