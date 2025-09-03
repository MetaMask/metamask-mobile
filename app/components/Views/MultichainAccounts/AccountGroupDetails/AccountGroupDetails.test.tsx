import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SolScope } from '@metamask/keyring-api';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { AccountGroupDetails } from './AccountGroupDetails';

import { AccountDetailsIds } from '../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';

import { isHDOrFirstPartySnapAccount } from '../../../../util/address';
import {
  createMockAccountGroup,
  createMockInternalAccount,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../util/address', () => ({
  isHDOrFirstPartySnapAccount: jest.fn(),
  toFormattedAddress: jest.fn((address) => address),
  areAddressesEqual: jest.fn((addr1, addr2) => addr1 === addr2),
}));

const mockAccountGroup = createMockAccountGroup(
  'keyring:test-wallet/0',
  'Test Account Group',
  ['account-1'],
);
const mockAccount = createMockInternalAccount(
  'account-1',
  '0x1234567890123456789012345678901234567890',
  'Test Account',
);
mockAccount.options.entropySource = 'keyring:test-wallet';
const mockWallet = {
  id: 'wallet-1',
  metadata: { name: 'Test Wallet' },
  type: 'keyring',
};

const mockNetworkControllerState = {
  networkConfigurationsByChainId: {
    0x1: {
      chainId: '0x1',
      name: 'Ethereum',
    },
    0xaa36a7: {
      chainId: '0xaa36a7',
      name: 'Sepolia Test Network',
    },
    0x2105: {
      chainId: '0x2105',
      name: 'Base',
    },
    0xa4b1: {
      chainId: '0xa4b1',
      name: 'Arbitrum One',
    },
  },
};

const mockMultichainNetworkController = {
  multichainNetworkConfigurationsByChainId: {
    [SolScope.Mainnet]: {
      name: 'Solana Mainnet',
      chainId: SolScope.Mainnet,
      isTestnet: false,
    },
    [SolScope.Testnet]: {
      name: 'Solana Testnet',
      chainId: SolScope.Testnet,
      isTestnet: true,
    },
    [SolScope.Devnet]: {
      name: 'Solana Devnet',
      chainId: SolScope.Devnet,
      isTestnet: true,
    },
  },
};

describe('AccountGroupDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isHDOrFirstPartySnapAccount as jest.Mock).mockReturnValue(true);
  });

  const defaultProps = {
    route: {
      params: {
        accountGroup: mockAccountGroup,
      },
    },
  };

  const mockState = {
    settings: {
      useBlockieIcon: false,
    },
    user: {
      seedphraseBackedUp: false,
    },
    engine: {
      backgroundState: {
        AccountTreeController: {
          accountTree: {
            wallets: {
              'wallet-1': mockWallet,
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              'account-1': mockAccount,
            },
            selectedAccount: 'account-1',
          },
        },
        KeyringController: {
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [mockAccount.address],
              metadata: {
                id: 'keyring:test-wallet',
              },
            },
          ],
        },
        NetworkController: mockNetworkControllerState,
        MultichainNetworkController: mockMultichainNetworkController,
      },
    },
  };

  it('renders correctly with account group details', () => {
    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
    expect(getByTestId(AccountDetailsIds.ACCOUNT_NAME_LINK)).toBeTruthy();
    expect(getByTestId(AccountDetailsIds.NETWORKS_LINK)).toBeTruthy();
    expect(getByTestId(AccountDetailsIds.PRIVATE_KEYS_LINK)).toBeTruthy();
    expect(getByTestId(AccountDetailsIds.SMART_ACCOUNT_LINK)).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    const backButton = getByTestId(AccountDetailsIds.BACK_BUTTON);
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('displays unlock to reveal text for private keys', () => {
    const { getByText } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    expect(getByText('Unlock to reveal')).toBeTruthy();
  });

  it('displays set up text for smart account', () => {
    const { getByText } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    expect(getByText('Set up')).toBeTruthy();
  });

  it('renders Wallet component when wallet exists', () => {
    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    expect(getByTestId(AccountDetailsIds.WALLET_NAME_LINK)).toBeTruthy();
  });

  it('does not render SecretRecoveryPhrase when account cannot export mnemonic', () => {
    (isHDOrFirstPartySnapAccount as jest.Mock).mockReturnValue(false);

    const { queryByText, queryByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    expect(queryByText('Secret Recovery Phrase')).toBeNull();
    expect(
      queryByTestId(AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK),
    ).toBeNull();
  });

  it('renders RemoveAccount for single account type', () => {
    const singleAccountGroup = createMockAccountGroup(
      'keyring:test-wallet/0',
      'Test Account Group',
    );

    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails
        {...defaultProps}
        route={{ params: { accountGroup: singleAccountGroup } }}
      />,
      { state: mockState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('does not render RemoveAccount for non-single account type', () => {
    const multiAccountGroup = createMockAccountGroup(
      'keyring:test-wallet/0',
      'Test Account Group',
      ['account-1', 'account-2'],
    );

    const { queryByText, queryByTestId } = renderWithProvider(
      <AccountGroupDetails
        {...defaultProps}
        route={{ params: { accountGroup: multiAccountGroup } }}
      />,
      { state: mockState },
    );

    expect(queryByText('Remove account')).toBeNull();
    expect(queryByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON)).toBeNull();
  });

  it('handles missing data gracefully', () => {
    const stateWithoutWallet = {
      ...mockState,
      engine: {
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountTreeController: { accountTree: { wallets: {} } },
        },
      },
    };
    const stateWithoutAccount = {
      ...mockState,
      engine: {
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountsController: {
            internalAccounts: { accounts: {}, selectedAccount: undefined },
          },
        },
      },
    };

    const { getByTestId: getByTestId1 } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: stateWithoutWallet },
    );
    const { getByTestId: getByTestId2 } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: stateWithoutAccount },
    );

    expect(
      getByTestId1(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
    expect(
      getByTestId2(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('navigates to Address List when Networks link is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    const networksLink = getByTestId(AccountDetailsIds.NETWORKS_LINK);
    fireEvent.press(networksLink);

    expect(mockNavigate).toHaveBeenCalledWith(expect.any(String), {
      groupId: mockAccountGroup.id,
      title: `Addresses / ${mockAccountGroup.metadata.name}`,
    });
  });

  it('navigates to Smart Account Details when Smart Account link is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    const smartAccountLink = getByTestId(AccountDetailsIds.SMART_ACCOUNT_LINK);
    fireEvent.press(smartAccountLink);

    expect(mockNavigate).toHaveBeenCalledWith('SmartAccountDetails', {
      account: expect.any(Object),
    });
  });
});
