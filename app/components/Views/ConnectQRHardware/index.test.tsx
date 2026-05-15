import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import ConnectQRHardware from './index';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import { ConnectQRHardwareSelectorsIDs } from './ConnectQRHardware.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import { AccountSelectorSelectorsIDs } from '../../UI/HardwareWallet/AccountSelector/AccountSelector.testIds';
import { QrKeyring, QrKeyringBridge } from '@metamask/eth-qr-keyring';
import type { Hex } from '@metamask/utils';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { strings } from '../../../../locales/i18n';

jest.mock('../../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn(),
}));

const MockRemoveAccountsFromPermissions = jest.mocked(
  removeAccountsFromPermissions,
);

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));
const mockSetTargetWalletType = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockSetQrScanRetryHandler = jest.fn();

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock(
  '../../../core/HardwareWallet/contexts/HardwareWalletContext',
  () => ({
    useHardwareWallet: () => ({
      setTargetWalletType: mockSetTargetWalletType,
      showHardwareWalletError: mockShowHardwareWalletError,
      setQrScanRetryHandler: mockSetQrScanRetryHandler,
    }),
  }),
);

jest.mock('../../UI/QRHardware/AnimatedQRScanner', () => ({
  __esModule: true,
  default: ({
    visible,
    onQRHardwareScanError,
    onModalHideComplete,
  }: {
    visible: boolean;
    onQRHardwareScanError?: (error: Error) => void;
    onModalHideComplete?: () => void;
  }) => {
    const ActualReact = jest.requireActual('react');
    const { View, Button } = jest.requireActual('react-native');
    const prevVisibleRef = ActualReact.useRef(visible);

    ActualReact.useEffect(() => {
      if (prevVisibleRef.current && !visible) {
        onModalHideComplete?.();
      }
      prevVisibleRef.current = visible;
    }, [visible, onModalHideComplete]);

    return visible ? (
      <View testID="animated-qr-scanner">
        <Button
          title="trigger-qr-hardware-error"
          onPress={() =>
            onQRHardwareScanError?.(
              new Error('Scanned QR code is not in UR format'),
            )
          }
        />
      </View>
    ) : null;
  },
}));

const mockedNavigate = {
  pop: jest.fn(),
  goBack: jest.fn(),
};

interface MockAccount {
  address: Hex;
  index: number;
  shortenedAddress: string;
  balance: string;
}

const mockPage0Accounts: MockAccount[] = [
  {
    address: '0x4678901234567890123456789012345678901210',
    shortenedAddress: '0x46789...01210',
    balance: '0x0',
    index: 0,
  },
  {
    address: '0xa1e359811322d97991e03f863a0c30c2cf029cd24',
    shortenedAddress: '0xa1e35...9cd24',
    balance: '0x0',
    index: 1,
  },
  {
    address: '0xc1e359811322d97991e03f863a0c30c2cf029ce22',
    shortenedAddress: '0xc1e35...9ce22',
    balance: '0x0',
    index: 2,
  },
  {
    address: '0xd0a1e359811322d97991e03f863a0c30c2cf029c1',
    shortenedAddress: '0xd0a1e...029c1',
    balance: '0x0',
    index: 3,
  },
  {
    address: '0x4a1e359811322d97991e03f863a0c30c2cf029c13',
    shortenedAddress: '0x4a1e3...29c13',
    balance: '0x0',
    index: 4,
  },
];

const mockPage1Accounts: MockAccount[] = [
  {
    address: '0x12345678901234567890123456789012345678902',
    shortenedAddress: '0x12345...78902',
    balance: '0x0',
    index: 5,
  },
  {
    address: '0x25678901234567890123456789012345678901231',
    shortenedAddress: '0x25678...01231',
    balance: '0x0',
    index: 6,
  },
  {
    address: '0x3b678901234567890123456789012345678901202',
    shortenedAddress: '0x3b678...01202',
    balance: '0x0',
    index: 7,
  },
  {
    address: '0x42345678901234567890123456789012345678904',
    shortenedAddress: '0x42345...78904',
    balance: '0x0',
    index: 8,
  },
  {
    address: '0x52345678901234567890123456789012345678904',
    shortenedAddress: '0x52345...78904',
    balance: '0x0',
    index: 9,
  },
];

const mockQrKeyringBridge: QrKeyringBridge = {
  requestScan: jest.fn(),
};

const mockQrKeyring = new QrKeyring({ bridge: mockQrKeyringBridge });

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../../core/HardwareWallets/analytics', () => ({
  getConnectedDevicesCount: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getAccounts: jest.fn(),
      getKeyringsByType: jest.fn().mockResolvedValue([]),
      withKeyring: (_selector: unknown, operation: (args: unknown) => void) =>
        operation({
          keyring: mockQrKeyring,
          metadata: { id: '1234' },
        }),
    },
    AccountTrackerController: {
      syncBalanceWithAddresses: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  qrKeyringScanner: mockQrKeyringBridge,
  setSelectedAddress: jest.fn(),
}));
const MockEngine = jest.mocked(Engine);

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('ConnectQRHardware', () => {
  const mockKeyringController = MockEngine.context.KeyringController;
  const mockAccountTrackerController =
    MockEngine.context.AccountTrackerController;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();

    // Re-establish QrKeyring spies each test. `testSetup.js` runs
    // `jest.restoreAllMocks()` in afterEach, which restores spied methods to
    // their real implementations, so spies must be recreated here.
    jest
      .spyOn(mockQrKeyring, 'getFirstPage')
      .mockResolvedValue(mockPage0Accounts);
    jest
      .spyOn(mockQrKeyring, 'getNextPage')
      .mockResolvedValue(mockPage1Accounts);
    jest
      .spyOn(mockQrKeyring, 'getPreviousPage')
      .mockResolvedValue(mockPage0Accounts);
    jest.spyOn(mockQrKeyring, 'forgetDevice').mockImplementation();
    jest
      .spyOn(mockQrKeyring, 'getName')
      .mockResolvedValue('KeystoneDevice' as never);
    jest
      .spyOn(mockQrKeyring, 'getAccounts')
      .mockReturnValue([
        '0x4678901234567890123456789012345678901210',
        '0x49A10E12ceaacC302548d3c1C72836C9298d180e',
      ] as never);
    jest.spyOn(mockQrKeyring, 'setAccountToUnlock').mockImplementation();
    jest
      .spyOn(mockQrKeyring, 'addAccounts')
      .mockResolvedValue(['0x4678901234567890123456789012345678901210']);

    mockAccountTrackerController.syncBalanceWithAddresses.mockImplementation(
      (addresses) =>
        Promise.resolve(
          addresses.reduce(
            (acc: { [key: string]: { balance: string } }, address) => {
              acc[address] = {
                balance: '0x0',
              };
              return acc;
            },
            {},
          ),
        ),
    );
  });

  it('renders first page correctly when user clicks `continue` button', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const { getByTestId, getByText } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);

    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.press(button);
    });

    expect(mockQrKeyring.getFirstPage).toHaveBeenCalledTimes(1);

    mockPage0Accounts.forEach((account) => {
      expect(getByText(account.shortenedAddress)).toBeDefined();
    });
  });

  it('renders next page correctly when user clicks `Next Page` button', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const { getByTestId, getByText } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);
    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.press(button);
    });

    const nextButton = getByTestId(AccountSelectorSelectorsIDs.NEXT_BUTTON);
    expect(nextButton).toBeDefined();
    await act(async () => {
      fireEvent.press(nextButton);
    });

    expect(mockQrKeyring.getNextPage).toHaveBeenCalledTimes(1);

    mockPage1Accounts.forEach((account) => {
      expect(getByText(account.shortenedAddress)).toBeDefined();
    });
  });

  it('renders previous page correctly when user clicks `Previous Page` button', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const { getByTestId, getByText } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);
    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.press(button);
    });

    const nextButton = getByTestId(AccountSelectorSelectorsIDs.NEXT_BUTTON);
    expect(nextButton).toBeDefined();
    await act(async () => {
      fireEvent.press(nextButton);
    });

    const prevButton = getByTestId(AccountSelectorSelectorsIDs.PREVIOUS_BUTTON);
    expect(prevButton).toBeDefined();
    await act(async () => {
      fireEvent.press(prevButton);
    });

    expect(mockQrKeyring.getPreviousPage).toHaveBeenCalledTimes(1);

    mockPage0Accounts.forEach((account) => {
      expect(getByText(account.shortenedAddress)).toBeDefined();
    });
  });

  it('removes any hardware wallet accounts from existing permissions', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);
    const withKeyringSpy = jest.spyOn(mockKeyringController, 'withKeyring');

    const { getByTestId } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);
    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.press(button);
    });

    const forgetButton = getByTestId(AccountSelectorSelectorsIDs.FORGET_BUTTON);
    expect(forgetButton).toBeDefined();
    await act(async () => {
      fireEvent.press(forgetButton);
    });

    expect(withKeyringSpy).toHaveBeenCalled();
    expect(MockRemoveAccountsFromPermissions).toHaveBeenCalledWith([
      '0x4678901234567890123456789012345678901210',
      '0x49A10E12ceaacC302548d3c1C72836C9298d180e',
    ]);
    expect(mockQrKeyring.forgetDevice).toHaveBeenCalled();
  });

  it('tracks hardware wallet continue connection event when continue button is pressed', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const { getByTestId } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(button);
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.HARDWARE_WALLET_CONTINUE_CONNECTION,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks hardware wallet add account event with QR device type when accounts are unlocked', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const { getByTestId, getByText, getAllByRole } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(button);
    });

    // Pressing the address label does not toggle @react-native-community/checkbox; drive onValueChange.
    const [firstRowCheckbox] = getAllByRole('checkbox');
    await act(async () => {
      fireEvent(firstRowCheckbox, 'onValueChange', true);
    });

    const unlockButton = getByText(strings('account_selector.unlock'));

    await act(async () => {
      fireEvent.press(unlockButton);
    });

    await waitFor(() => {
      expect(mockedNavigate.pop).toHaveBeenCalledWith(2);
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.HARDWARE_WALLET_ADD_ACCOUNT,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks hardware wallet forgotten event with QR device type when device is forgotten', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const { getByTestId } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(button);
    });

    const forgetButton = getByTestId(AccountSelectorSelectorsIDs.FORGET_BUTTON);

    await act(async () => {
      fireEvent.press(forgetButton);
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.HARDWARE_WALLET_FORGOTTEN,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('includes device type property in continue connection event', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const mockAddProperties = jest.fn().mockReturnThis();
    const mockBuild = jest.fn().mockReturnValue({});
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    const { getByTestId } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(button);
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      device_type: HardwareDeviceTypes.QR,
    });
    expect(mockBuild).toHaveBeenCalled();
  });

  it('shows hardware wallet bottom sheet error for QR scan errors', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);
    jest
      .mocked(mockQrKeyring.getFirstPage)
      .mockImplementationOnce(() => new Promise(() => undefined));

    const { getByTestId, getByText } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    await act(async () => {
      fireEvent.press(
        getByTestId(ConnectQRHardwareSelectorsIDs.CONTINUE_BUTTON),
      );
    });

    await act(async () => {
      fireEvent.press(getByText('trigger-qr-hardware-error'));
    });

    expect(mockShowHardwareWalletError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Scanned QR code is not in UR format',
      }),
    );
  });
});
