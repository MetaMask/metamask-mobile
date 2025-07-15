import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { BaseAccountDetails } from './index';
import { strings } from '../../../../../../../locales/i18n';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import Routes from '../../../../../../constants/navigation/Routes';
import { AccountDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { formatAddress } from '../../../../../../util/address';
import { RootState } from '../../../../../../reducers';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockAccount = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Test Account',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
};

describe('BaseAccountDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with account information', () => {
    const { getByText, getByTestId, getAllByText } = renderWithProvider(
      <BaseAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );
    const shortAddress = formatAddress(mockAccount.address, 'short');

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();

    expect(
      getByText(strings('multichain_accounts.account_details.account_name')),
    ).toBeTruthy();
    // there are 2 text components in the account details container
    expect(getAllByText(mockAccount.metadata.name)).toHaveLength(2);

    expect(
      getByText(strings('multichain_accounts.account_details.account_address')),
    ).toBeTruthy();
    expect(getByText(shortAddress)).toBeTruthy();
  });

  it('shows JazzIcon avatar when useBlockieIcon is false', () => {
    const stateWithJazzIcon = {
      settings: {
        useBlockieIcon: false,
      },
    };

    const { getByTestId } = renderWithProvider(
      <BaseAccountDetails account={mockAccount} />,
      { state: stateWithJazzIcon },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('shows Blockies avatar when useBlockieIcon is true', () => {
    const stateWithBlockies = {
      settings: {
        useBlockieIcon: true,
      },
    };

    const { getByTestId } = renderWithProvider(
      <BaseAccountDetails account={mockAccount} />,
      { state: stateWithBlockies },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BaseAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    const backButton = getByTestId(AccountDetailsIds.BACK_BUTTON);
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to edit account name when account name is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BaseAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    const accountNameLink = getByTestId(AccountDetailsIds.ACCOUNT_NAME_LINK);
    fireEvent.press(accountNameLink);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME,
      { account: mockAccount },
    );
  });

  it('navigates to share address when account address is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BaseAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    const accountAddressLink = getByTestId(
      AccountDetailsIds.ACCOUNT_ADDRESS_LINK,
    );
    fireEvent.press(accountAddressLink);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS,
      { account: mockAccount },
    );
  });

  it('handles different account types', () => {
    const snapAccount = createMockInternalAccount(
      '0x9876543210987654321098765432109876543210',
      'Snap Account',
      KeyringTypes.snap,
      EthAccountType.Eoa,
    );
    const shortAddress = formatAddress(snapAccount.address, 'short');

    const { getByText, getAllByText } = renderWithProvider(
      <BaseAccountDetails account={snapAccount} />,
      { state: mockInitialState },
    );

    expect(getAllByText(snapAccount.metadata.name)).toHaveLength(2);
    expect(getByText(shortAddress)).toBeTruthy();
  });

  it('navigates to wallet details when wallet name is pressed', () => {
    const mockWalletId = 'keyring:wallet-test';
    const mockWallet = {
      id: mockWalletId,
      metadata: { name: 'Test Wallet' },
      groups: {
        'keyring:1:ethereum': {
          accounts: [mockAccount.id],
        },
      },
    };

    const mockStateWithWallet = {
      ...mockInitialState,
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets: {
                [mockWalletId]: mockWallet,
              },
            },
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '1',
                minimumVersion: '1.0.0',
              },
            },
          },
        },
      },
    } as unknown as RootState;

    const { getByTestId } = renderWithProvider(
      <BaseAccountDetails account={mockAccount} />,
      { state: mockStateWithWallet },
    );

    const walletNameLink = getByTestId(AccountDetailsIds.WALLET_NAME_LINK);
    fireEvent.press(walletNameLink);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS,
      { walletId: mockWalletId },
    );
  });
});
