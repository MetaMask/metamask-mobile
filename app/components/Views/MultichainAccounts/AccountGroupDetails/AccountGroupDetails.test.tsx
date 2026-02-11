import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { BackHandler, NativeEventSubscription } from 'react-native';
import { SolScope } from '@metamask/keyring-api';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { AccountGroupDetails } from './AccountGroupDetails';

import { AccountDetailsIds } from '../AccountDetails.testIds';

import {
  isHDOrFirstPartySnapAccount,
  isHardwareAccount,
} from '../../../../util/address';
import {
  createMockAccountGroup,
  createMockInternalAccount,
  createMockWallet,
  createMockInternalAccountsFromGroups,
  createMockState,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { KeyringTypes } from '@metamask/keyring-controller';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../../selectors/multichainAccounts/accounts', () => {
  const actual = jest.requireActual(
    '../../../../selectors/multichainAccounts/accounts',
  );
  return {
    ...actual,
    selectIconSeedAddressByAccountGroupId: jest.fn(() =>
      jest.fn(() => '0xseed'),
    ),
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../util/address', () => ({
  isHDOrFirstPartySnapAccount: jest.fn(),
  isHardwareAccount: jest.fn(),
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
const groups = [mockAccountGroup];
const mockWallet = createMockWallet(
  'keyring:test-wallet',
  'Test Wallet',
  groups,
);
const internalAccounts = createMockInternalAccountsFromGroups(groups);
const baseState = createMockState([mockWallet], internalAccounts);

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
    (isHardwareAccount as jest.Mock).mockReturnValue(false);
  });

  const defaultProps = {
    route: {
      params: {
        accountGroup: mockAccountGroup,
      },
    },
  };

  const mockState = {
    ...baseState,
    settings: {
      avatarAccountType: AvatarAccountType.Maskicon,
    },
    user: {
      seedphraseBackedUp: false,
    },
    engine: {
      ...baseState.engine,
      backgroundState: {
        ...baseState.engine.backgroundState,
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

  it('handles hardware back press by navigating back and prevents default', () => {
    const removeMock = jest.fn();
    const addListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(
        (
          event: 'hardwareBackPress',
          _handler: () => boolean | null | undefined,
        ): NativeEventSubscription => {
          expect(event).toBe('hardwareBackPress');
          return { remove: removeMock } as unknown as NativeEventSubscription;
        },
      );

    const { unmount } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );

    // Multiple subscriptions may exist. Invoke handlers until we find the one that triggers goBack.
    let foundHandlerCalledGoBack = false;
    let observedResult: boolean | null | undefined;
    for (const call of addListenerSpy.mock.calls) {
      const maybeHandler = call?.[1] as
        | (() => boolean | null | undefined)
        | undefined;
      if (!maybeHandler) {
        continue;
      }
      mockGoBack.mockClear();
      observedResult = maybeHandler();
      if (mockGoBack.mock.calls.length > 0) {
        foundHandlerCalledGoBack = true;
        break;
      }
    }

    expect(foundHandlerCalledGoBack).toBe(true);
    expect(observedResult).toBe(true);

    unmount();
    expect(removeMock).toHaveBeenCalled();

    addListenerSpy.mockRestore();
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

    // Create a new mock state with the multi-account group
    const multiAccountGroups = [multiAccountGroup];
    const multiAccountWallet = createMockWallet(
      'keyring:test-wallet',
      'Test Wallet',
      multiAccountGroups,
    );
    const multiAccountInternalAccounts =
      createMockInternalAccountsFromGroups(multiAccountGroups);
    const multiAccountState = createMockState(
      [multiAccountWallet],
      multiAccountInternalAccounts,
    );

    const { queryByText, queryByTestId } = renderWithProvider(
      <AccountGroupDetails
        {...defaultProps}
        route={{ params: { accountGroup: multiAccountGroup } }}
      />,
      { state: multiAccountState },
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
      onLoad: expect.any(Function),
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

  it('navigates to edit account name when account name is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      { state: mockState },
    );
    const accountNameLink = getByTestId(AccountDetailsIds.ACCOUNT_NAME_LINK);
    fireEvent.press(accountNameLink);

    expect(mockNavigate).toHaveBeenCalledWith('EditMultichainAccountName', {
      accountGroup: mockAccountGroup,
    });
  });

  it('uses the group icon seed address to render the avatar', () => {
    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails {...defaultProps} />,
      {
        state: mockState,
      },
    );

    // Assert that the selector selectIconSeedAddressByAccountGroupId was called
    const { selectIconSeedAddressByAccountGroupId: mockedFactory } =
      jest.requireMock('../../../../selectors/multichainAccounts/accounts');
    expect(mockedFactory).toHaveBeenCalledWith(mockAccountGroup.id);

    // Assert that the avatar is rendered
    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_GROUP_DETAILS_AVATAR),
    ).toBeTruthy();
  });

  it('hides private key button for hardware wallet accounts', () => {
    (isHardwareAccount as jest.Mock).mockReturnValue(true);

    const mockLedgerAccount = createMockInternalAccount(
      'ledger-account-1',
      '0x1234567890123456789012345678901234567890',
      'Ledger Account',
    );
    mockLedgerAccount.metadata.keyring.type = KeyringTypes.ledger;

    const mockLedgerAccountGroup = createMockAccountGroup(
      'keyring:ledger-wallet/0',
      'Ledger Account Group',
      ['ledger-account-1'],
    );

    const ledgerState = {
      ...mockState,
      engine: {
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountsController: {
            internalAccounts: {
              accounts: {
                'ledger-account-1': mockLedgerAccount,
              },
              selectedAccount: 'ledger-account-1',
            },
          },
        },
      },
    };

    const { queryByTestId } = renderWithProvider(
      <AccountGroupDetails
        {...defaultProps}
        route={{ params: { accountGroup: mockLedgerAccountGroup } }}
      />,
      { state: ledgerState },
    );

    // Verify that the private key button is NOT visible for hardware wallet accounts
    expect(queryByTestId(AccountDetailsIds.PRIVATE_KEYS_LINK)).toBeNull();
  });

  it('shows private key button for non-hardware wallet accounts', () => {
    // Mock isHardwareAccount to return false for non-hardware wallets
    (isHardwareAccount as jest.Mock).mockReturnValue(false);

    // Create a mock HD account (non-hardware wallet)
    const mockHDAccount = createMockInternalAccount(
      'hd-account-1',
      '0x1234567890123456789012345678901234567890',
      'HD Account',
    );
    mockHDAccount.metadata.keyring.type = KeyringTypes.hd;

    const mockHDAccountGroup = createMockAccountGroup(
      'keyring:hd-wallet/0',
      'HD Account Group',
      ['hd-account-1'],
    );

    const hdState = {
      ...mockState,
      engine: {
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountsController: {
            internalAccounts: {
              accounts: {
                'hd-account-1': mockHDAccount,
              },
              selectedAccount: 'hd-account-1',
            },
          },
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <AccountGroupDetails
        {...defaultProps}
        route={{ params: { accountGroup: mockHDAccountGroup } }}
      />,
      { state: hdState },
    );

    // Verify that the private key button IS visible for non-hardware wallet accounts
    expect(getByTestId(AccountDetailsIds.PRIVATE_KEYS_LINK)).toBeTruthy();
  });
});
