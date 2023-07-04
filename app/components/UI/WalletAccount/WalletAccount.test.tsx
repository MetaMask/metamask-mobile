// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// External dependencies
import renderWithProvider from '../../../util/test/renderWithProvider';
import ClipboardManager from '../../../core/ClipboardManager';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';

// Internal dependencies
import WalletAccount from './WalletAccount';

const initialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          nickname: 'Ethereum mainnet',
          ticket: 'eth',
          chainId: '1',
        },
      },
      PreferencesController: {
        selectedAddress: '0x',
        identities: { '0x': { name: 'Account 1' } },
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
    .mockImplementation((callback) => callback(initialState)),
}));

describe('WalletAccount', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<WalletAccount />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows the account address', () => {
    const { getByTestId } = renderWithProvider(<WalletAccount />, {
      state: initialState,
    });
    expect(getByTestId('wallet-account-address')).toBeDefined();
  });

  it('copies the account address to the clipboard when the copy button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<WalletAccount />, {
      state: initialState,
    });

    fireEvent.press(getByTestId('wallet-account-copy-button'));
    expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the account selector screen on account press', () => {
    const { getByTestId } = renderWithProvider(<WalletAccount />, {
      state: initialState,
    });

    fireEvent.press(getByTestId('account-picker'));
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createAccountSelectorNavDetails({}),
    );
  });
});
