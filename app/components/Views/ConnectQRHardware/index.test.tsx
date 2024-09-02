import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import ConnectQRHardware from './index';
import { fireEvent } from '@testing-library/react-native';
import { QR_CONTINUE_BUTTON } from '../../../../wdio/screen-objects/testIDs/Components/ConnectQRHardware.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import { act } from '@testing-library/react-hooks';
import PAGINATION_OPERATIONS from '../../../constants/pagination';
import {
  ACCOUNT_SELECTOR_NEXT_BUTTON,
  ACCOUNT_SELECTOR_PREVIOUS_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Components/AccountSelector.testIds';

const mockedNavigate = jest.fn();

const mockPage0Accounts = [
  {
    address: '0x4x678901234567890123456789012345678901210',
    balance: '0x0',
    index: 0,
  },
  {
    address: '0xa1e359811322d97991e03f863a0c30c2cf029cd24',
    balance: '0x0',
    index: 1,
  },
  {
    address: '0xc1e359811322d97991e03f863a0c30c2cf029ce22',
    balance: '0x0',
    index: 2,
  },
  {
    address: '0xd0a1e359811322d97991e03f863a0c30c2cf029c1',
    balance: '0x0',
    index: 3,
  },
  {
    address: '0x4a1e359811322d97991e03f863a0c30c2cf029c13',
    balance: '0x0',
    index: 4,
  },
];

const mockPage1Accounts = [
  {
    address: '0x12345678901234567890123456789012345678902',
    balance: '0x0',
    index: 5,
  },
  {
    address: '0x25678901234567890123456789012345678901231',
    balance: '0x0',
    index: 6,
  },
  {
    address: '0x3b678901234567890123456789012345678901202',
    balance: '0x0',
    index: 7,
  },
  {
    address: '0x42345678901234567890123456789012345678904',
    balance: '0x0',
    index: 8,
  },
  {
    address: '0x52345678901234567890123456789012345678904',
    balance: '0x0',
    index: 9,
  },
];

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
      getOrAddQRKeyring: jest.fn(),
      withKeyring: jest.fn(),
      connectQRHardware: jest.fn(),
    },
    AccountTrackerController: {
      syncBalanceWithAddresses: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
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
  mockKeyringController.connectQRHardware.mockImplementation((page) => {
    switch (page) {
      case PAGINATION_OPERATIONS.GET_NEXT_PAGE:
        return Promise.resolve(mockPage1Accounts);

      case PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE:
        return Promise.resolve(mockPage0Accounts);

      default:
        // return account lists in first page.
        return Promise.resolve(mockPage0Accounts);
    }
  });

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

    expect(mockKeyringController.connectQRHardware).toHaveBeenCalledTimes(1);
    expect(mockKeyringController.connectQRHardware).toHaveBeenCalledWith(
      PAGINATION_OPERATIONS.GET_FIRST_PAGE,
    );

    mockPage0Accounts.forEach((account) => {
      expect(getByText(account.address)).toBeDefined();
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

    expect(mockKeyringController.connectQRHardware).toHaveBeenCalledTimes(2);
    expect(mockKeyringController.connectQRHardware).toHaveBeenCalledWith(
      PAGINATION_OPERATIONS.GET_NEXT_PAGE,
    );

    mockPage1Accounts.forEach((account) => {
      expect(getByText(account.address)).toBeDefined();
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

    expect(mockKeyringController.connectQRHardware).toHaveBeenCalledTimes(3);
    expect(mockKeyringController.connectQRHardware).toHaveBeenCalledWith(
      PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE,
    );

    mockPage0Accounts.forEach((account) => {
      expect(getByText(account.address)).toBeDefined();
    });
  });
});
