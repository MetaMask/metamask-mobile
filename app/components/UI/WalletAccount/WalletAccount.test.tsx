// Third party dependencies.
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies
import renderWithProvider from '../../../util/test/renderWithProvider';
import ClipboardManager from '../../../core/ClipboardManager';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';
import { backgroundState } from '../../../util/test/initial-root-state';
import { Account } from '../../hooks/useAccounts';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount2,
  expectedUuid2,
} from '../../../util/test/accountsControllerTestUtils';

// Internal dependencies
import WalletAccount from './WalletAccount';

const MOCK_CHAIN_ID = '0x1';

const MOCK_ENS_CACHED_NAME = 'fox.eth';

const mockAccount: Account = {
  name: internalAccount2.metadata.name,
  address: internalAccount2.address,
  type: internalAccount2.metadata.keyring.type as KeyringTypes,
  yOffset: 0,
  isSelected: true,
};

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        providerConfig: {
          chainId: MOCK_CHAIN_ID,
        },
      },
    },
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

jest.mock('../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../util/ENSUtils'),
  doENSReverseLookup: jest
    .fn()
    .mockImplementation((address: string, chainId: string) => {
      const cacheKey = `${chainId}${address}`;
      const MOCK_ENS_CACHE = {
        [`${MOCK_CHAIN_ID}${mockAccount.address}`]: MOCK_ENS_CACHED_NAME,
      };
      return MOCK_ENS_CACHE[cacheKey];
    }),
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
  it('displays the correct account name', () => {
    const { getByText } = renderWithProvider(<WalletAccount />, {
      state: mockInitialState,
    });
    expect(getByText(mockAccount.name)).toBeDefined();
  });
  it('displays ENS name when defined and account name is the default', async () => {
    const { getByText } = renderWithProvider(<WalletAccount />, {
      state: mockInitialState,
    });
    // Wait for ENS to update state
    await waitFor(() => {
      expect(getByText(MOCK_ENS_CACHED_NAME)).toBeDefined();
    });
  });
  it('displays custom account name when ENS is defined but account name is not the default', async () => {
    const customAccountName = 'Custom Account Name';
    mockInitialState.engine.backgroundState.AccountsController.internalAccounts.accounts[
      expectedUuid2
    ].metadata.name = customAccountName;
    const { getByText } = renderWithProvider(<WalletAccount />, {
      state: mockInitialState,
    });
    // Wait for ENS to update state
    await waitFor(() => {
      expect(getByText(customAccountName)).toBeDefined();
    });
  });
});
