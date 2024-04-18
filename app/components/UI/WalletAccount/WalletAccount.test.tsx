// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// External dependencies
import renderWithProvider from '../../../util/test/renderWithProvider';
import ClipboardManager from '../../../core/ClipboardManager';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';

// Internal dependencies
import WalletAccount from './WalletAccount';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { Account } from '../../hooks/useAccounts';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  createMockInternalAccount,
  createMockUUIDFromAddress,
} from '../../../selectors/accountsController.test';
import { AccountsControllerState } from '@metamask/accounts-controller';

const MOCK_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

const expectedUUID = createMockUUIDFromAddress(MOCK_ADDRESS);

const internalAccount1 = createMockInternalAccount(
  MOCK_ADDRESS.toLowerCase(),
  'Account 1',
);

const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      [expectedUUID]: internalAccount1,
    },
    selectedAccount: expectedUUID,
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
          },
        ],
      },
    },
  },
}));

const mockAccount: Account = {
  name: 'Test account 1',
  address: MOCK_ADDRESS,
  type: KeyringTypes.hd,
  yOffset: 0,
  isSelected: true,
};

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/ClipboardManager');

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

describe('WalletAccount', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <WalletAccount account={mockAccount} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows the account address', () => {
    const { getByTestId } = renderWithProvider(
      <WalletAccount account={mockAccount} />,
      {
        state: mockInitialState,
      },
    );
    expect(getByTestId('wallet-account-address')).toBeDefined();
  });

  it('copies the account address to the clipboard when the copy button is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <WalletAccount account={mockAccount} />,
      {
        state: mockInitialState,
      },
    );

    fireEvent.press(getByTestId('wallet-account-copy-button'));
    expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the account selector screen on account press', () => {
    const { getByTestId } = renderWithProvider(
      <WalletAccount account={mockAccount} />,
      {
        state: mockInitialState,
      },
    );

    fireEvent.press(getByTestId('account-picker'));
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createAccountSelectorNavDetails({}),
    );
  });
  it('displays the correct account name', () => {
    const { getByText } = renderWithProvider(
      <WalletAccount account={mockAccount} />,
      {
        state: mockInitialState,
      },
    );
    expect(getByText(mockAccount.name)).toBeDefined();
  });
  it('displays custom account name when ENS is defined but account name is not the default', () => {
    const ensName = 'test.eth';
    const { getByText } = renderWithProvider(
      <WalletAccount account={mockAccount} ens={ensName} />,
      {
        state: mockInitialState,
      },
    );
    expect(getByText(mockAccount.name)).toBeDefined();
  });
  it('displays ENS name when defined and account name is the default', () => {
    const ensName = 'test.eth';
    const mockAccountWithDefaultName: Account = {
      ...mockAccount,
      name: 'Account 1',
    };
    const { getByText } = renderWithProvider(
      <WalletAccount account={mockAccountWithDefaultName} ens={ensName} />,
      {
        state: mockInitialState,
      },
    );
    expect(getByText(ensName)).toBeDefined();
  });
});
