import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';

import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import LedgerSelectAccount from './index';
import {
  forgetLedger,
  getHDPath,
  getLedgerAccounts,
  getLedgerAccountsByOperation,
  setHDPath,
  unlockLedgerWalletAccount,
} from '../../../core/Ledger/Ledger';
import { getConnectedDevicesCount } from '../../../core/HardwareWallets/analytics';
import { useHardwareWallet } from '../../../core/HardwareWallet';
import PAGINATION_OPERATIONS from '../../../constants/pagination';
import {
  LEDGER_BIP44_PATH,
  LEDGER_LIVE_PATH,
} from '../../../core/Ledger/constants';
import HardwareWalletTestIds from '../hardware-wallet/hardwareWallet.testIds';

const mockedDispatch = jest.fn();
const mockedNavDispatch = jest.fn();
const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

const mockEnsureDeviceReady = jest.fn().mockResolvedValue(true);

jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      dispatch: mockedNavDispatch,
      goBack: mockedGoBack,
      navigate: mockedNavigate,
    }),
    StackActions: {
      pop: jest.fn((count: number) => ({
        type: 'POP',
        payload: { count },
      })),
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
  getConnectedDevicesCount: jest.fn(),
}));

jest.mock('../../../util/hardwareWallet/deviceNameUtils', () => ({
  sanitizeDeviceName: jest.fn((name: string) => name),
}));

jest.mock('../../UI/BlockingActionModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const { useEffect } = R;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  return ({
    children,
    modalVisible,
    onAnimationCompleted,
  }: {
    children: R.ReactNode;
    modalVisible?: boolean;
    onAnimationCompleted?: () => void;
  }) => {
    useEffect(() => {
      if (modalVisible) {
        onAnimationCompleted?.();
      }
    }, [modalVisible, onAnimationCompleted]);

    return R.createElement(View, {}, children);
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getAccounts: jest.fn(),
    },
    AccountsController: {
      getAccountByAddress: jest.fn(),
      setAccountName: jest.fn(),
    },
  },
}));

const mockUseHardwareWallet = useHardwareWallet as jest.MockedFunction<
  typeof useHardwareWallet
>;
const mockGetLedgerAccountsByOperation =
  getLedgerAccountsByOperation as jest.MockedFunction<
    typeof getLedgerAccountsByOperation
  >;
const mockUnlockLedgerWalletAccount =
  unlockLedgerWalletAccount as jest.MockedFunction<
    typeof unlockLedgerWalletAccount
  >;
const mockForgetLedger = forgetLedger as jest.MockedFunction<
  typeof forgetLedger
>;
const mockGetHDPath = getHDPath as jest.MockedFunction<typeof getHDPath>;
const mockGetLedgerAccounts = getLedgerAccounts as jest.MockedFunction<
  typeof getLedgerAccounts
>;
const mockSetHDPath = setHDPath as jest.MockedFunction<typeof setHDPath>;
const mockGetConnectedDevicesCount =
  getConnectedDevicesCount as jest.MockedFunction<
    typeof getConnectedDevicesCount
  >;

const mockAccounts = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    index: 0,
    balance: '0x0',
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    index: 1,
    balance: '0x0',
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
  setTargetWalletType: jest.fn(),
  selectDiscoveredDevice: jest.fn(),
  rescanDevices: jest.fn(),
  connectToDevice: jest.fn(),
  closeConnectionFlow: jest.fn(),
  acknowledgeConnectionSuccess: jest.fn(),
  setConnectionSheetVisible: jest.fn(),
  showHardwareWalletError: jest.fn(),
  showAwaitingConfirmation: jest.fn(),
  hideAwaitingConfirmation: jest.fn(),
};

describe('LedgerSelectAccount', () => {
  const mockKeyringController = (Engine as typeof Engine).context
    .KeyringController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseHardwareWallet.mockReturnValue({ ...defaultHardwareWalletValues });
    mockKeyringController.getAccounts.mockResolvedValue([]);
    mockGetLedgerAccountsByOperation.mockResolvedValue(mockAccounts);
    mockGetHDPath.mockResolvedValue(LEDGER_LIVE_PATH);
    mockGetLedgerAccounts.mockResolvedValue([]);
    mockSetHDPath.mockResolvedValue(undefined);
    mockUnlockLedgerWalletAccount.mockResolvedValue(undefined);
    mockForgetLedger.mockResolvedValue(undefined);
    mockGetConnectedDevicesCount.mockResolvedValue(1);
  });

  const renderScreen = () =>
    renderWithProvider(<LedgerSelectAccount />, {
      state: {
        user: {
          appTheme: 'dark',
        },
      },
    });

  it('shows the loading state while Ledger accounts are loading', () => {
    let resolveAccounts:
      | ((value: { address: string; index: number; balance: string }[]) => void)
      | undefined;
    mockGetLedgerAccountsByOperation.mockReturnValue(
      new Promise((resolve) => {
        resolveAccounts = resolve;
      }),
    );

    const { getByText, unmount } = renderScreen();

    expect(getByText('Looking for device')).toBeTruthy();

    resolveAccounts?.(mockAccounts);
    unmount();
  });

  it('renders the redesigned account selection flow', async () => {
    const { getByText, getByTestId } = renderScreen();

    await waitFor(() => {
      expect(getByText('Select accounts')).toBeTruthy();
    });

    expect(getByTestId(`${HardwareWalletTestIds.ACCOUNT_CARD}-0`)).toBeTruthy();
    expect(getByText('Ethereum')).toBeTruthy();
    expect(getByText('Solana')).toBeTruthy();
    expect(getByText('Bitcoin')).toBeTruthy();
  });

  it('loads the next and previous Ledger account pages', async () => {
    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_NEXT_BUTTON),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_NEXT_BUTTON),
      );
    });

    await waitFor(() => {
      expect(mockGetLedgerAccountsByOperation).toHaveBeenLastCalledWith(
        PAGINATION_OPERATIONS.GET_NEXT_PAGE,
      );
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_PREVIOUS_BUTTON),
      );
    });

    await waitFor(() => {
      expect(mockGetLedgerAccountsByOperation).toHaveBeenLastCalledWith(
        PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
      );
    });
  });

  it('opens the HD path settings flow and updates the selected path', async () => {
    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_SETTINGS_BUTTON),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_SETTINGS_BUTTON),
      );
    });

    expect(mockedNavigate).toHaveBeenCalled();

    const settingsParams = mockedNavigate.mock.calls[0][1];

    await act(async () => {
      await settingsParams.onValueChange(LEDGER_BIP44_PATH);
    });

    await waitFor(() => {
      expect(mockSetHDPath).toHaveBeenCalledWith(LEDGER_BIP44_PATH);
      expect(mockGetLedgerAccountsByOperation).toHaveBeenCalledWith(
        PAGINATION_OPERATIONS.GET_FIRST_PAGE,
      );
    });
  });

  it('unlocks the selected Ledger account when continuing', async () => {
    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(
        getByTestId(`${HardwareWalletTestIds.ACCOUNT_CARD}-0`),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId(`${HardwareWalletTestIds.ACCOUNT_CARD}-0`));
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_CONTINUE_BUTTON),
      );
    });

    await waitFor(() => {
      expect(mockEnsureDeviceReady).toHaveBeenCalledWith('test-device-id');
      expect(mockUnlockLedgerWalletAccount).toHaveBeenCalledWith(0);
      expect(mockedNavDispatch).toHaveBeenCalledWith(StackActions.pop(2));
    });
  });

  it('does not unlock accounts when the device is not ready', async () => {
    mockEnsureDeviceReady.mockResolvedValueOnce(false);
    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(
        getByTestId(`${HardwareWalletTestIds.ACCOUNT_CARD}-0`),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId(`${HardwareWalletTestIds.ACCOUNT_CARD}-0`));
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_CONTINUE_BUTTON),
      );
    });

    await waitFor(() => {
      expect(mockEnsureDeviceReady).toHaveBeenCalledWith('test-device-id');
      expect(mockUnlockLedgerWalletAccount).not.toHaveBeenCalled();
    });
  });

  it('shows the unlock error when adding an account fails', async () => {
    mockUnlockLedgerWalletAccount.mockRejectedValueOnce(
      new Error('Unlock failed'),
    );
    const { getByTestId, findByText } = renderScreen();

    await waitFor(() => {
      expect(
        getByTestId(`${HardwareWalletTestIds.ACCOUNT_CARD}-0`),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId(`${HardwareWalletTestIds.ACCOUNT_CARD}-0`));
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_CONTINUE_BUTTON),
      );
    });

    expect(await findByText('Unlock failed')).toBeTruthy();
  });

  it('forgets the connected device from the footer action', async () => {
    const { getByTestId } = renderScreen();

    await waitFor(() => {
      expect(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_FORGET_BUTTON),
      ).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletTestIds.ACCOUNT_SELECTION_FORGET_BUTTON),
      );
    });

    await waitFor(() => {
      expect(mockForgetLedger).toHaveBeenCalled();
      expect(mockedDispatch).toHaveBeenCalled();
      expect(mockedNavDispatch).toHaveBeenCalledWith(StackActions.pop(2));
    });
  });
});
