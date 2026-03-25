import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
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

let capturedOnAnimationCompleted: (() => void) | null = null;

jest.mock('../../UI/BlockingActionModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(
      (props: {
        modalVisible: boolean;
        isLoadingAction: boolean;
        children: React.ReactNode;
        onAnimationCompleted?: () => void;
      }) => {
        MockReact.useEffect(() => {
          if (props.modalVisible && props.onAnimationCompleted) {
            capturedOnAnimationCompleted = props.onAnimationCompleted;
          }
        }, [props.modalVisible, props.onAnimationCompleted]);

        if (!props.modalVisible) return null;

        return MockReact.createElement(
          View,
          { testID: 'blocking-action-modal' },
          props.children,
        );
      },
    ),
  };
});

jest.mock('@react-native-community/checkbox', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(
      (props: {
        value?: boolean;
        disabled?: boolean;
        onValueChange?: () => void;
      }) =>
        MockReact.createElement(TouchableOpacity, {
          testID: `account-checkbox${props.disabled ? '-disabled' : ''}`,
          onPress: props.disabled ? undefined : props.onValueChange,
          accessible: true,
          accessibilityRole: 'checkbox',
        }),
    ),
  };
});

jest.mock('../../UI/SelectOptionSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(
      (props: {
        options: { key: string; label: string; value: string }[];
        label: string;
        onValueChange: (val: string) => void;
        selectedValue: string;
      }) => {
        const selectedOption = props.options?.find(
          (o: { value: string }) => o.value === props.selectedValue,
        );
        return MockReact.createElement(
          View,
          { testID: 'select-drop-down' },
          MockReact.createElement(
            Text,
            null,
            selectedOption ? selectedOption.label : '',
          ),
          props.options?.map(
            (option: { key: string; label: string; value: string }) =>
              MockReact.createElement(
                TouchableOpacity,
                {
                  key: option.key,
                  testID: `select-option-${option.key}`,
                  onPress: () => props.onValueChange(option.value),
                },
                MockReact.createElement(Text, null, option.label),
              ),
          ),
        );
      },
    ),
  };
});

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
    capturedOnAnimationCompleted = null;
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

  const renderAndConnect = renderAndWaitForAccounts;

  const triggerModalAnimation = async () => {
    await act(async () => {
      capturedOnAnimationCompleted?.();
    });
  };

  const selectAccountAndUnlock = async (
    getByText: (text: string) => ReactTestInstance,
    getAllByTestId: (testId: string) => ReactTestInstance[],
  ) => {
    const checkboxes = getAllByTestId('account-checkbox');
    await act(async () => {
      fireEvent.press(checkboxes[0]);
    });

    await act(async () => {
      fireEvent.press(getByText('Unlock'));
    });

    await triggerModalAnimation();
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
  });

  describe('Error Handling', () => {
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

  describe('HD Path Options', () => {
    it('renders HD path dropdown with correct options', async () => {
      const { getByTestId } = await renderAndConnect();

      expect(getByTestId(SELECT_DROP_DOWN)).toBeOnTheScreen();
      expect(
        getByTestId(`select-option-${LEDGER_LIVE_PATH}`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`select-option-${LEDGER_LEGACY_PATH}`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`select-option-${LEDGER_BIP44_PATH}`),
      ).toBeOnTheScreen();
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

    it('dispatches setReloadAccounts after forget', async () => {
      const { getByTestId } = await renderAndConnect();

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      await triggerModalAnimation();

      await waitFor(() => {
        expect(mockedDispatch).toHaveBeenCalled();
      });
    });

    it('navigates back using StackActions.pop(2) after forget', async () => {
      const { getByTestId } = await renderAndConnect();

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      await triggerModalAnimation();

      await waitFor(() => {
        expect(mockedNavDispatch).toHaveBeenCalled();
      });
    });
  });

  describe('showLoadingModal', () => {
    it('shows loading modal during pagination', async () => {
      const { getByTestId, queryByText } = await renderAndConnect();

      // Mock a slow response
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

      await waitFor(() => {
        expect(queryByText('Please wait')).not.toBeOnTheScreen();
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

  describe('onUnlock full flow via onAnimationCompleted', () => {
    beforeEach(() => {
      mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
      mockGetConnectedDevicesCount.mockResolvedValue(2);
      mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
      mockGetLedgerAccounts.mockResolvedValue([]);
    });

    it('unlocks accounts, tracks event, and navigates on success', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      const { getByText, getAllByTestId } = await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockUnlockLedgerWalletAccount).toHaveBeenCalledWith(0);
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ADD_ACCOUNT,
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            device_type: HardwareDeviceTypes.LEDGER,
            device_model: 'Nano X',
            hd_path: 'Ledger Live',
            connected_device_count: '2',
          }),
        );
        expect(mockedNavDispatch).toHaveBeenCalled();
      });
    });

    it('tracks error event and shows error on unlock failure', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);
      mockUnlockLedgerWalletAccount.mockRejectedValue(
        new Error('Unlock failed'),
      );

      const { getByText, getAllByTestId } = await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_ERROR,
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            device_type: HardwareDeviceTypes.LEDGER,
            error: 'Unlock failed',
          }),
        );
      });
    });

    it('shows ETH app not open message on unlock error with 0x6d00', async () => {
      mockUnlockLedgerWalletAccount.mockRejectedValue(
        new Error('Error with status code 0x6d00'),
      );

      const { getByText, getAllByTestId, queryByText } =
        await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(
          queryByText('Please open the Ethereum app on your Ledger device.'),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('onForget full flow via onAnimationCompleted', () => {
    it('calls forgetLedger, dispatches, tracks event, and navigates', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      const { getByTestId } = await renderAndConnect();

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      await triggerModalAnimation();

      await waitFor(() => {
        expect(mockForgetLedger).toHaveBeenCalled();
        expect(mockedDispatch).toHaveBeenCalled();
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN,
        );
        expect(mockedNavDispatch).toHaveBeenCalled();
      });
    });
  });

  describe('updateNewLegacyAccountsLabel full flow', () => {
    it('renames newly added accounts when using legacy HD path', async () => {
      const newAccount = '0xnewaccount1234567890abcdef1234567890abcdef';
      mockGetHDPath.mockResolvedValue(LEDGER_LEGACY_PATH);
      mockGetLedgerAccounts.mockResolvedValue([newAccount]);
      mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
      mockGetConnectedDevicesCount.mockResolvedValue(1);
      (mockAccountsController.getAccountByAddress as jest.Mock).mockReturnValue(
        {
          id: 'account-id',
          metadata: { name: 'Ledger 1' },
        },
      );

      const { getByText, getAllByTestId } = await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockGetHDPath).toHaveBeenCalled();
        expect(mockGetLedgerAccounts).toHaveBeenCalled();
        expect(mockAccountsController.getAccountByAddress).toHaveBeenCalledWith(
          newAccount,
        );
        expect(mockAccountsController.setAccountName).toHaveBeenCalledWith(
          'account-id',
          'Ledger 1 (legacy)',
        );
      });
    });

    it('does not rename accounts when getAccountByAddress returns undefined', async () => {
      const newAccount = '0xnewaccount1234567890abcdef1234567890abcdef';
      mockGetHDPath.mockResolvedValue(LEDGER_LEGACY_PATH);
      mockGetLedgerAccounts.mockResolvedValue([newAccount]);
      mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
      mockGetConnectedDevicesCount.mockResolvedValue(1);
      (mockAccountsController.getAccountByAddress as jest.Mock).mockReturnValue(
        undefined,
      );

      const { getByText, getAllByTestId } = await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockGetLedgerAccounts).toHaveBeenCalled();
      });

      expect(mockAccountsController.setAccountName).not.toHaveBeenCalled();
    });

    it('skips label update for non-legacy paths', async () => {
      mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
      mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
      mockGetConnectedDevicesCount.mockResolvedValue(1);

      const { getByText, getAllByTestId } = await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockGetHDPath).toHaveBeenCalled();
      });

      expect(mockAccountsController.setAccountName).not.toHaveBeenCalled();
    });

    it('does not rename accounts that already exist', async () => {
      mockGetHDPath.mockResolvedValue(LEDGER_LEGACY_PATH);
      mockGetLedgerAccounts.mockResolvedValue(mockExistingAccounts);
      mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
      mockGetConnectedDevicesCount.mockResolvedValue(1);

      const { getByText, getAllByTestId } = await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockGetLedgerAccounts).toHaveBeenCalled();
      });

      expect(mockAccountsController.setAccountName).not.toHaveBeenCalled();
    });
  });

  describe('onSelectedPathChanged via SelectOptionSheet', () => {
    it('changes HD path and calls setHDPath for legacy path', async () => {
      const { getByTestId } = await renderAndConnect();

      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(`select-option-${LEDGER_LEGACY_PATH}`));
      });

      await waitFor(() => {
        expect(mockSetHDPath).toHaveBeenCalledWith(LEDGER_LEGACY_PATH);
      });
    });

    it('changes HD path and calls setHDPath for BIP44 path', async () => {
      const { getByTestId } = await renderAndConnect();

      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(`select-option-${LEDGER_BIP44_PATH}`));
      });

      await waitFor(() => {
        expect(mockSetHDPath).toHaveBeenCalledWith(LEDGER_BIP44_PATH);
      });
    });
  });

  describe('getPathString coverage via onUnlock analytics', () => {
    beforeEach(() => {
      mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
      mockGetConnectedDevicesCount.mockResolvedValue(1);
      mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
      mockGetLedgerAccounts.mockResolvedValue([]);
    });

    it('uses Ledger Live path string in analytics', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      const { getByText, getAllByTestId } = await renderAndConnect();

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            hd_path: 'Ledger Live',
          }),
        );
      });
    });

    it('uses Legacy path string in analytics', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      const { getByText, getByTestId, getAllByTestId } =
        await renderAndConnect();

      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(`select-option-${LEDGER_LEGACY_PATH}`));
      });

      await waitFor(() => {
        expect(mockSetHDPath).toHaveBeenCalledWith(LEDGER_LEGACY_PATH);
      });

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            hd_path: 'Ledger Legacy',
          }),
        );
      });
    });

    it('uses BIP44 path string in analytics', async () => {
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({}),
      };
      mockCreateEventBuilder.mockReturnValue(mockBuilder);

      const { getByText, getByTestId, getAllByTestId } =
        await renderAndConnect();

      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);

      await act(async () => {
        fireEvent.press(getByTestId(`select-option-${LEDGER_BIP44_PATH}`));
      });

      await waitFor(() => {
        expect(mockSetHDPath).toHaveBeenCalledWith(LEDGER_BIP44_PATH);
      });

      await selectAccountAndUnlock(getByText, getAllByTestId);

      await waitFor(() => {
        expect(mockBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            hd_path: 'Ledger BIP44',
          }),
        );
      });
    });
  });

  describe('isAppLaunchConfirmationNeeded modal text', () => {
    it('shows open ETH app text when connectionState is AwaitingApp', async () => {
      mockUseHardwareWallet.mockReturnValue({
        ...defaultHardwareWalletValues,
        connectionState: {
          status: ConnectionStatus.AwaitingApp,
          deviceId: 'test-device-id',
          appName: 'Ethereum',
        },
      });

      mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);
      const { getByTestId, queryByText } = renderWithProvider(
        <LedgerSelectAccount />,
      );

      await waitFor(() => {
        expect(queryByText('Select an account')).toBeOnTheScreen();
      });

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      await waitFor(() => {
        expect(queryByText('Please open the Ethereum app')).toBeOnTheScreen();
      });
    });

    it('shows please wait text when connectionState is not AwaitingApp', async () => {
      const { getByTestId, queryByText } = await renderAndConnect();

      await act(async () => {
        fireEvent.press(getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON));
      });

      expect(queryByText('Please wait')).toBeOnTheScreen();
    });
  });

  describe('selectedOption effect with error handling', () => {
    it('catches and displays ETH app error when fetching accounts on path change', async () => {
      const { getByTestId, queryByText } = await renderAndConnect();

      mockGetLedgerAccountsByOperation.mockRejectedValueOnce(
        new Error('Error with status code 0x6d00'),
      );

      await act(async () => {
        fireEvent.press(getByTestId(`select-option-${LEDGER_LEGACY_PATH}`));
      });

      await waitFor(() => {
        expect(
          queryByText('Please open the Ethereum app on your Ledger device.'),
        ).toBeOnTheScreen();
      });
    });

    it('catches and displays non-ETH error when fetching accounts on path change', async () => {
      const { getByTestId, queryByText } = await renderAndConnect();

      mockGetLedgerAccountsByOperation.mockRejectedValueOnce(
        new Error('Network connection failed'),
      );

      await act(async () => {
        fireEvent.press(getByTestId(`select-option-${LEDGER_LEGACY_PATH}`));
      });

      await waitFor(() => {
        expect(queryByText('Network connection failed')).toBeOnTheScreen();
      });
    });
  });
});
