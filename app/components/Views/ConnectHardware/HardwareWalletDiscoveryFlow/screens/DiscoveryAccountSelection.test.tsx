import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '@metamask/design-system-react-native';
import DiscoveryAccountSelectionScreen from './DiscoveryAccountSelection';
import type { AccountInfo, DeviceUIConfig } from '../DiscoveryFlow.types';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockSetTargetWalletType = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    getParent: jest.fn(),
    dispatch: jest.fn(),
  }),
  StackActions: {
    popToTop: jest.fn(),
  },
}));

jest.mock('../../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    showHardwareWalletError: mockShowHardwareWalletError,
    setTargetWalletType: mockSetTargetWalletType,
  }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
    })),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        getAccounts: jest.fn().mockResolvedValue([]),
      },
      AccountsController: {},
    },
    getQrKeyringScanner: jest.fn(() => ({
      resolvePendingScan: jest.fn(),
      rejectPendingScan: jest.fn(),
    })),
  },
}));

const mockEnsureDeviceReady = jest.fn().mockResolvedValue(true);

jest.mock('../../../../../core/HardwareWallet/adapters/factory', () => ({
  createAdapter: jest.fn(() => ({
    disconnect: jest.fn().mockResolvedValue(undefined),
    ensureDeviceReady: mockEnsureDeviceReady,
  })),
}));

jest.mock('../../../../UI/HardwareWallet/AccountSelector/hooks', () => ({
  useAccountsBalance: jest.fn(() => ({})),
}));

jest.mock('../../../../UI/QRHardware/AnimatedQRScanner', () => () => null);

jest.mock('../../../../UI/BlockingActionModal', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../../UI/SelectOptionSheet', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./DiscoveryNotFound', () => ({
  __esModule: true,
  default: () => null,
}));

const TEST_CONFIG: DeviceUIConfig = {
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: 'Ledger',
  stateMachineName: 'Ledger_states',
  deviceIcon: IconName.Mobile,
  troubleshootingItems: [],
  errorToStepMap: {},
  accountManager: {
    getAccounts: jest.fn().mockResolvedValue([]),
    unlockAccounts: jest.fn().mockResolvedValue(undefined),
    forgetDevice: jest.fn().mockResolvedValue(undefined),
    getHDPathOptions: jest.fn(() => [
      {
        key: 'ledger-live',
        label: 'Ledger Live',
        value: 'ledger-live',
      },
    ]),
    setHDPath: jest.fn().mockResolvedValue(undefined),
  },
  strings: {
    deviceFound: 'Device found',
    connectButton: 'Connect',
    deviceNotFound: 'Device not found',
    tryAgain: 'Try again',
    selectAccounts: 'Select accounts',
  },
};

const TEST_ACCOUNTS: AccountInfo[] = [
  {
    index: 0,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    balance: '0xde0b6b3a7640000',
  },
];

const NEXT_PAGE_ACCOUNTS: AccountInfo[] = [
  {
    index: 0,
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    balance: '0x1bc16d674ec80000',
  },
];

describe('DiscoveryAccountSelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureDeviceReady.mockResolvedValue(true);
  });

  it('renders redesigned account cards for preloaded accounts', async () => {
    render(
      <DiscoveryAccountSelectionScreen
        config={TEST_CONFIG}
        onBack={mockGoBack}
        selectedDevice={{ id: 'ledger-1', name: 'Ledger Nano X' }}
        initialAccounts={TEST_ACCOUNTS}
      />,
    );

    await act(async () => undefined);

    expect(
      await screen.findByTestId(
        'discovery-account-card-0x1234567890abcdef1234567890abcdef12345678',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Select accounts')).toBeOnTheScreen();
    expect(screen.getByTestId('discovery-accounts-settings')).toBeOnTheScreen();
    expect(screen.getByTestId('discovery-account-row-0')).toBeOnTheScreen();
    expect(screen.getByTestId('discovery-accounts-forget')).toBeOnTheScreen();
    expect(screen.getByTestId('discovery-accounts-continue')).toBeOnTheScreen();
  });

  it('hides previous pagination control on the first page', async () => {
    render(
      <DiscoveryAccountSelectionScreen
        config={TEST_CONFIG}
        onBack={mockGoBack}
        selectedDevice={{ id: 'ledger-1', name: 'Ledger Nano X' }}
        initialAccounts={TEST_ACCOUNTS}
      />,
    );

    await act(async () => undefined);

    expect(
      screen.queryByTestId('discovery-accounts-prev-page'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('discovery-accounts-next-page'),
    ).toBeOnTheScreen();
  });

  it('renders updated accounts after moving to the next page', async () => {
    const getAccounts = jest
      .fn()
      .mockResolvedValueOnce(NEXT_PAGE_ACCOUNTS)
      .mockResolvedValueOnce(TEST_ACCOUNTS);
    const config = {
      ...TEST_CONFIG,
      accountManager: {
        ...TEST_CONFIG.accountManager,
        getAccounts,
      },
    };

    render(
      <DiscoveryAccountSelectionScreen
        config={config}
        onBack={mockGoBack}
        selectedDevice={{ id: 'ledger-1', name: 'Ledger Nano X' }}
        initialAccounts={TEST_ACCOUNTS}
      />,
    );

    await act(async () => undefined);

    fireEvent.press(screen.getByTestId('discovery-accounts-next-page'));

    expect(
      await screen.findByTestId(
        'discovery-account-card-0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        'discovery-account-card-0x1234567890abcdef1234567890abcdef12345678',
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId('discovery-accounts-prev-page'),
    ).toBeOnTheScreen();
  });

  it('does not re-run device readiness before fetching the next page', async () => {
    const getAccounts = jest.fn().mockResolvedValueOnce(NEXT_PAGE_ACCOUNTS);
    const config = {
      ...TEST_CONFIG,
      accountManager: {
        ...TEST_CONFIG.accountManager,
        getAccounts,
      },
    };

    render(
      <DiscoveryAccountSelectionScreen
        config={config}
        onBack={mockGoBack}
        selectedDevice={{ id: 'ledger-1', name: 'Ledger Nano X' }}
        initialAccounts={TEST_ACCOUNTS}
      />,
    );

    await act(async () => undefined);

    fireEvent.press(screen.getByTestId('discovery-accounts-next-page'));

    expect(
      await screen.findByTestId('discovery-accounts-prev-page'),
    ).toBeOnTheScreen();
    expect(mockEnsureDeviceReady).not.toHaveBeenCalled();
    expect(getAccounts).toHaveBeenCalledWith('1');
  });

  it('shows the hardware wallet error flow when the next page call fails', async () => {
    const pageError = new Error(
      'Please open the Ethereum app on your Ledger device.',
    );
    const getAccounts = jest.fn().mockRejectedValueOnce(pageError);
    const config = {
      ...TEST_CONFIG,
      accountManager: {
        ...TEST_CONFIG.accountManager,
        getAccounts,
      },
    };

    render(
      <DiscoveryAccountSelectionScreen
        config={config}
        onBack={mockGoBack}
        selectedDevice={{ id: 'ledger-1', name: 'Ledger Nano X' }}
        initialAccounts={TEST_ACCOUNTS}
      />,
    );

    await act(async () => undefined);

    fireEvent.press(screen.getByTestId('discovery-accounts-next-page'));

    await act(async () => undefined);

    expect(mockShowHardwareWalletError).toHaveBeenCalledWith(pageError);
  });

  it('shows the hardware wallet error flow when the previous page call fails', async () => {
    const pageError = new Error('Device locked');
    const getAccounts = jest
      .fn()
      .mockResolvedValueOnce(NEXT_PAGE_ACCOUNTS)
      .mockRejectedValueOnce(pageError);
    const config = {
      ...TEST_CONFIG,
      accountManager: {
        ...TEST_CONFIG.accountManager,
        getAccounts,
      },
    };

    render(
      <DiscoveryAccountSelectionScreen
        config={config}
        onBack={mockGoBack}
        selectedDevice={{ id: 'ledger-1', name: 'Ledger Nano X' }}
        initialAccounts={TEST_ACCOUNTS}
      />,
    );

    await act(async () => undefined);

    fireEvent.press(screen.getByTestId('discovery-accounts-next-page'));
    await screen.findByTestId('discovery-accounts-prev-page');

    fireEvent.press(screen.getByTestId('discovery-accounts-prev-page'));

    await act(async () => undefined);

    expect(mockShowHardwareWalletError).toHaveBeenCalledWith(pageError);
  });
});
