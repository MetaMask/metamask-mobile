import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import ConnectQRHardware from './index';
import { fireEvent } from '@testing-library/react-native';
import { QR_CONTINUE_BUTTON } from '../../../../wdio/screen-objects/testIDs/Components/ConnectQRHardware.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import { act } from '@testing-library/react-hooks';
import {
  ACCOUNT_SELECTOR_FORGET_BUTTON,
  ACCOUNT_SELECTOR_NEXT_BUTTON,
  ACCOUNT_SELECTOR_PREVIOUS_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Components/AccountSelector.testIds';
import { QrKeyringBridge } from '@metamask/eth-qr-keyring';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';

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

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockedNavigate = {
  pop: jest.fn(),
  goBack: jest.fn(),
};

const mockPage0Accounts = [
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

const mockPage1Accounts = [
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

const mockQrKeyring = {
  getFirstPage: jest.fn(),
  getNextPage: jest.fn(),
  getPreviousPage: jest.fn(),
  forgetDevice: jest.fn(),
  getName: jest.fn().mockResolvedValue('KeystoneDevice'),
  getAccounts: jest
    .fn()
    .mockReturnValue([
      '0x4678901234567890123456789012345678901210',
      '0x49A10E12ceaacC302548d3c1C72836C9298d180e',
    ]),
};

const mockQrKeyringBridge: QrKeyringBridge = {
  requestScan: jest.fn(),
};

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
  mockQrKeyring.getFirstPage.mockResolvedValue(mockPage0Accounts);
  mockQrKeyring.getNextPage.mockResolvedValue(mockPage1Accounts);
  mockQrKeyring.getPreviousPage.mockResolvedValue(mockPage0Accounts);

  const mockAccountTrackerController =
    MockEngine.context.AccountTrackerController;
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
  });

  it('renders correctly to match snapshot', () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);
    const wrapper = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders first page correctly when user clicks `continue` button', async () => {
    mockKeyringController.getAccounts.mockResolvedValue([]);

    const { getByTestId, getByText } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(QR_CONTINUE_BUTTON);

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

    const button = getByTestId(QR_CONTINUE_BUTTON);
    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.press(button);
    });

    const nextButton = getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON);
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

    const button = getByTestId(QR_CONTINUE_BUTTON);
    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.press(button);
    });

    const nextButton = getByTestId(ACCOUNT_SELECTOR_NEXT_BUTTON);
    expect(nextButton).toBeDefined();
    await act(async () => {
      fireEvent.press(nextButton);
    });

    const prevButton = getByTestId(ACCOUNT_SELECTOR_PREVIOUS_BUTTON);
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

    const button = getByTestId(QR_CONTINUE_BUTTON);
    expect(button).toBeDefined();

    await act(async () => {
      fireEvent.press(button);
    });

    const forgetButton = getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON);
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

    const button = getByTestId(QR_CONTINUE_BUTTON);

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

    const { getByTestId, getByText } = renderWithProvider(
      <ConnectQRHardware navigation={mockedNavigate} />,
      { state: mockInitialState },
    );

    const button = getByTestId(QR_CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(button);
    });

    const checkbox = getByText(mockPage0Accounts[0].shortenedAddress);

    await act(async () => {
      fireEvent.press(checkbox);
    });

    const unlockButton = getByText('Unlock');

    await act(async () => {
      fireEvent.press(unlockButton);
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

    const button = getByTestId(QR_CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(button);
    });

    const forgetButton = getByTestId(ACCOUNT_SELECTOR_FORGET_BUTTON);

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

    const button = getByTestId(QR_CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(button);
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      device_type: HardwareDeviceTypes.QR,
    });
    expect(mockBuild).toHaveBeenCalled();
  });
});
