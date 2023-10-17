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

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
        identities: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': { name: 'Account 1' },
        },
      },
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
    const { toJSON } = renderWithProvider(<WalletAccount />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows the account address', () => {
    const { getByTestId } = renderWithProvider(<WalletAccount />, {
      state: mockInitialState,
    });
    expect(getByTestId('wallet-account-address')).toBeDefined();
  });

  it('copies the account address to the clipboard when the copy button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<WalletAccount />, {
      state: mockInitialState,
    });

    fireEvent.press(getByTestId('wallet-account-copy-button'));
    expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the account selector screen on account press', () => {
    const { getByTestId } = renderWithProvider(<WalletAccount />, {
      state: mockInitialState,
    });

    fireEvent.press(getByTestId('account-picker'));
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createAccountSelectorNavDetails({}),
    );
  });
});
