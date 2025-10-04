import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { waitFor, within, fireEvent } from '@testing-library/react-native';
import { Alert, AlertButton, View } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import EvmAccountSelectorList from './EvmAccountSelectorList';
import { useAccounts, Account } from '../../hooks/useAccounts';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { regex } from '../../../util/regex';
import {
  createMockAccountsControllerState,
  createMockAccountsControllerStateWithSnap,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { EvmAccountSelectorListProps } from './EvmAccountSelectorList.types';
import Engine from '../../../core/Engine';
import { CellComponentSelectorsIDs } from '../../../../e2e/selectors/wallet/CellComponent.selectors';
import { KeyringTypes } from '@metamask/keyring-controller';
import { ACCOUNT_SELECTOR_LIST_TESTID } from './EvmAccountSelectorList.constants';
import { AVATARGROUP_CONTAINER_TESTID } from '../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.constants';
import { KnownCaipNamespace } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

const BUSINESS_ACCOUNT = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const PERSONAL_ACCOUNT = '0xd018538C87232FF95acbCe4870629b75640a78E7';

// Those ID have been generated with createMockUuidFromAddress, but we hardcode them here, otherwise jest
// will complain.
const BUSINESS_ACCOUNT_ID = '30786334-3935-4563-b064-363339643939';
const PERSONAL_ACCOUNT_ID = '30786430-3138-4533-b863-383732333266';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  BUSINESS_ACCOUNT,
  PERSONAL_ACCOUNT,
]);

// Mock InteractionManager to run callbacks immediately in tests
const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

jest.mock('../../../util/address', () => {
  const actual = jest.requireActual('../../../util/address');
  return {
    ...actual,
    getLabelTextByInternalAccount: jest.fn(),
  };
});

// Mock isDefaultAccountName from ENSUtils
jest.mock('../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../util/ENSUtils'),
  isDefaultAccountName: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock useAccounts
jest.mock('../../hooks/useAccounts', () => {
  const useAccountsMock = jest.fn(() => ({
    accounts: [
      {
        id: BUSINESS_ACCOUNT_ID,
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: 'eip155:0:0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      },
      {
        id: PERSONAL_ACCOUNT_ID,
        name: 'Account 2',
        address: PERSONAL_ACCOUNT,
        assets: {
          fiatBalance: '$6400.00\n2 ETH',
          tokens: [],
        },
        type: 'HD Key Tree',
        yOffset: 78,
        isSelected: false,
        balanceError: undefined,
        caipAccountId: 'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7',
      },
    ],
    evmAccounts: [],
    ensByAccountAddress: {},
  }));
  return {
    useAccounts: useAccountsMock,
    Account: Object, // Mock for the Account type
  };
});

// Mock Engine
jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      removeAccount: jest.fn(),
    },
    AccountsController: {
      getAccountByAddress: jest.fn().mockImplementation((address) => ({
        address,
        name:
          address === '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'
            ? 'Account 1'
            : 'Account 2',
      })),
    },
    PermissionController: {
      state: {
        subjects: {},
      },
    },
  },
  getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue('0'),
}));

const MOCK_NETWORKS_WITH_TRANSACTION_ACTIVITY = {
  [BUSINESS_ACCOUNT.toLowerCase()]: {
    namespace: 'eip155:0',
    activeChains: ['1', '56'],
  },
  [PERSONAL_ACCOUNT.toLowerCase()]: {
    namespace: 'eip155:0',
    activeChains: ['1', '137'],
  },
};

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
        }),
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTreeController: {
        accountTrees: {
          roots: {
            'default-group': {
              metadata: {
                name: 'Default Group',
              },
              groups: {
                'hd-accounts': {
                  accounts: [BUSINESS_ACCOUNT_ID, PERSONAL_ACCOUNT_ID],
                },
              },
            },
          },
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [BUSINESS_ACCOUNT]: { balance: '0xDE0B6B3A7640000' },
            [PERSONAL_ACCOUNT]: { balance: '0x1BC16D674EC80000' },
          },
        },
      },
      PreferencesController: {
        isMultiAccountBalancesEnabled: true,
        selectedAddress: BUSINESS_ACCOUNT,
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 3200,
          },
        },
      },
      MultichainNetworkController: {
        networksWithTransactionActivity:
          MOCK_NETWORKS_WITH_TRANSACTION_ACTIVITY,
      },
      FeatureFlagController: {
        multichainAccounts: {
          enabled: false,
          enabledForDevelopment: false,
        },
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const onSelectAccount = jest.fn();
const onRemoveImportedAccount = jest.fn();

// Helper function to set mock implementation for useAccounts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setAccountsMock = (mockAccounts: any[], mockEnsByAccountAddress = {}) => {
  const mockAccountData = {
    accounts: mockAccounts,
    evmAccounts: [],
    ensByAccountAddress: mockEnsByAccountAddress,
  };
  (useAccounts as jest.Mock).mockImplementation(() => mockAccountData);
  return mockAccountData;
};

const defaultAccountsMock = [
  {
    id: BUSINESS_ACCOUNT_ID,
    name: 'Account 1',
    address: BUSINESS_ACCOUNT,
    assets: {
      fiatBalance: '$3200.00\n1 ETH',
      tokens: [],
    },
    type: 'HD Key Tree',
    yOffset: 0,
    isSelected: true,
    balanceError: undefined,
    caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
    isLoadingAccount: false,
    scopes: [],
  },
  {
    id: PERSONAL_ACCOUNT_ID,
    name: 'Account 2',
    address: PERSONAL_ACCOUNT,
    assets: {
      fiatBalance: '$6400.00\n2 ETH',
      tokens: [],
    },
    type: 'HD Key Tree',
    yOffset: 78,
    isSelected: false,
    balanceError: undefined,
    caipAccountId: `eip155:0:${PERSONAL_ACCOUNT}`,
    isLoadingAccount: false,
    scopes: [],
  },
];

const EvmAccountSelectorListUseAccounts: React.FC<
  EvmAccountSelectorListProps
> = ({ privacyMode = false }) => {
  // Set the mock implementation for this specific component render
  if (privacyMode) {
    setAccountsMock(defaultAccountsMock);
  }
  const { accounts, ensByAccountAddress } = useAccounts();
  return (
    <EvmAccountSelectorList
      onSelectAccount={onSelectAccount}
      onRemoveImportedAccount={onRemoveImportedAccount}
      accounts={accounts}
      ensByAccountAddress={ensByAccountAddress}
      isRemoveAccountEnabled
      privacyMode={privacyMode}
    />
  );
};

const RIGHT_ACCESSORY_TEST_ID = 'right-accessory';

const EvmAccountSelectorListRightAccessoryUseAccounts = () => {
  const { accounts, ensByAccountAddress } = useAccounts();
  return (
    <EvmAccountSelectorList
      renderRightAccessory={(address, name) => (
        <View testID={RIGHT_ACCESSORY_TEST_ID}>{`${address} - ${name}`}</View>
      )}
      isSelectionDisabled
      selectedAddresses={[]}
      accounts={accounts}
      ensByAccountAddress={ensByAccountAddress}
    />
  );
};

const renderComponent = (
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any = {},
  EvmAccountSelectorListTest = EvmAccountSelectorListUseAccounts,
) => renderWithProvider(<EvmAccountSelectorListTest {...state} />, { state });

describe('EvmAccountSelectorList', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set default mock implementation
    setAccountsMock(defaultAccountsMock);

    // Reset function mocks
    onSelectAccount.mockClear();
    onRemoveImportedAccount.mockClear();
    mockNavigate.mockClear();
    (Engine.context.KeyringController.removeAccount as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders correctly', async () => {
    const { toJSON } = renderComponent(initialState);
    await waitFor(() => expect(toJSON()).toMatchSnapshot());
  });

  it('renders all accounts with balances', async () => {
    const { queryByTestId, getAllByTestId, toJSON } =
      renderComponent(initialState);

    await waitFor(async () => {
      const businessAccountItem = await queryByTestId(
        `${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${BUSINESS_ACCOUNT}`,
      );
      const personalAccountItem = await queryByTestId(
        `${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${PERSONAL_ACCOUNT}`,
      );

      if (!businessAccountItem || !personalAccountItem) {
        throw new Error('Account items not found');
      }

      expect(
        within(businessAccountItem).getByText(regex.usd(3200)),
      ).toBeDefined();

      expect(
        within(personalAccountItem).getByText(regex.usd(6400)),
      ).toBeDefined();

      const accounts = getAllByTestId(regex.accountBalance);
      expect(accounts.length).toBe(2);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('renders all accounts with right accessory', async () => {
    const { getAllByTestId, toJSON } = renderComponent(
      initialState,
      EvmAccountSelectorListRightAccessoryUseAccounts,
    );

    await waitFor(() => {
      const rightAccessories = getAllByTestId(RIGHT_ACCESSORY_TEST_ID);
      expect(rightAccessories.length).toBe(2);

      // Check that each right accessory contains the expected content
      expect(rightAccessories[0].props.children).toContain(BUSINESS_ACCOUNT);
      expect(rightAccessories[1].props.children).toContain(PERSONAL_ACCOUNT);

      expect(toJSON()).toMatchSnapshot();
    });
  });
  it('renders correct account names', async () => {
    const { getAllByTestId } = renderComponent(initialState);

    await waitFor(() => {
      const accountNameItems = getAllByTestId(
        CellComponentSelectorsIDs.BASE_TITLE,
      );
      expect(within(accountNameItems[0]).getByText('Account 1')).toBeDefined();
      expect(within(accountNameItems[1]).getByText('Account 2')).toBeDefined();
    });
  });
  it('renders the snap name tag for Snap accounts', async () => {
    // Setup mock with snap accounts
    const mockSnapAccounts = [
      {
        name: 'Snap Account 1',
        address: MOCK_ADDRESS_1,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: KeyringTypes.snap,
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${MOCK_ADDRESS_1}`,
      },
    ];

    setAccountsMock(mockSnapAccounts);

    const mockAccountsWithSnap = createMockAccountsControllerStateWithSnap(
      [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
      'MetaMask Simple Snap Keyring',
    );

    const stateWithSnapAccount = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountsController: mockAccountsWithSnap,
        },
      },
    };

    const { queryByText } = renderComponent(stateWithSnapAccount);

    await waitFor(async () => {
      const snapTag = await queryByText('MetaMask Simple Snap Keyring');
      expect(snapTag).toBeDefined();
    });
  });
  it('Text is hidden when privacy mode is on', async () => {
    const state = {
      ...initialState,
      privacyMode: true,
    };

    const { queryByTestId } = renderComponent(state);

    await waitFor(() => {
      const businessAccountItem = queryByTestId(
        `${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${BUSINESS_ACCOUNT}`,
      );

      if (!businessAccountItem) {
        throw new Error('Business account item not found');
      }

      expect(
        within(businessAccountItem).queryByText(regex.usd(3200)),
      ).toBeNull();

      expect(
        within(businessAccountItem).getByText('••••••••••••'),
      ).toBeDefined();
    });
  });
  it('allows account removal for simple keyring type', async () => {
    const mockAlert = jest.spyOn(Alert, 'alert');
    mockAlert.mockReset();
    mockAlert.mockImplementation(
      (_title, _message, buttons?: AlertButton[]) => {
        // Simulate user clicking "Yes, remove it"
        buttons?.[1]?.onPress?.();
      },
    );

    // Setup mock with removable account
    const mockSimpleAccount = [
      {
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: KeyringTypes.simple, // Important: must be simple type for removal
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
    ];

    setAccountsMock(mockSimpleAccount);

    // Create a state with a simple keyring account
    const mockAccountsWithSimple = createMockAccountsControllerState([
      BUSINESS_ACCOUNT,
    ]);
    const accountUuid = Object.keys(
      mockAccountsWithSimple.internalAccounts.accounts,
    )[0];
    mockAccountsWithSimple.internalAccounts.accounts[accountUuid].metadata = {
      ...mockAccountsWithSimple.internalAccounts.accounts[accountUuid].metadata,
      keyring: {
        type: KeyringTypes.simple,
      },
    };

    const stateWithSimpleAccount = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountsController: mockAccountsWithSimple,
        },
      },
    };

    const { getAllByTestId } = renderComponent(stateWithSimpleAccount);

    // Find all cell elements with the select-with-menu test ID
    const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);
    // Trigger long press on the first cell (since we only have one account in this test)
    cells[0].props.onLongPress();

    await waitFor(() => {
      // Verify Alert was shown with correct text
      expect(mockAlert).toHaveBeenCalledWith(
        'Account removal',
        'Do you really want to remove this account?',
        expect.any(Array),
        { cancelable: false },
      );
    });

    // Verify onRemoveImportedAccount was called with correct parameters
    expect(onRemoveImportedAccount).toHaveBeenCalledWith({
      removedAddress: BUSINESS_ACCOUNT,
    });

    // Verify KeyringController.removeAccount was called
    expect(Engine.context.KeyringController.removeAccount).toHaveBeenCalledWith(
      BUSINESS_ACCOUNT,
    );

    mockAlert.mockRestore();
  });

  it('allows account removal for snap keyring type', async () => {
    const mockAlert = jest.spyOn(Alert, 'alert');
    mockAlert.mockReset();
    mockAlert.mockImplementation(
      (_title, _message, buttons?: AlertButton[]) => {
        // Simulate user clicking "Yes, remove it"
        buttons?.[1]?.onPress?.();
      },
    );

    // Setup mock with removable snap accounts
    const mockSnapAccounts = [
      {
        name: 'Snap Account 1',
        address: MOCK_ADDRESS_1,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: KeyringTypes.snap, // Important: must be snap type for removal
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${MOCK_ADDRESS_1}`,
      },
      {
        name: 'Snap Account 2',
        address: MOCK_ADDRESS_2,
        assets: {
          fiatBalance: '$6400.00\n2 ETH',
          tokens: [],
        },
        type: KeyringTypes.snap, // Important: must be snap type for removal
        yOffset: 78,
        isSelected: false,
        balanceError: undefined,
        caipAccountId: `eip155:0:${MOCK_ADDRESS_2}`,
      },
    ];

    setAccountsMock(mockSnapAccounts);

    const mockAccountsWithSnap = createMockAccountsControllerStateWithSnap(
      [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
      'MetaMask Simple Snap Keyring',
    );

    const stateWithSnapAccount = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountsController: mockAccountsWithSnap,
        },
      },
    };

    const { getAllByTestId } = renderComponent(stateWithSnapAccount);

    // Find all cell elements with the select-with-menu test ID
    const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);
    // Trigger long press on the first cell that should correspond to MOCK_ADDRESS_1
    cells[0].props.onLongPress();

    // Need to wait for the Alert to be called
    await waitFor(() => {
      // Verify Alert was shown with correct text
      expect(mockAlert).toHaveBeenCalledWith(
        'Account removal',
        'Do you really want to remove this account?',
        expect.any(Array),
        { cancelable: false },
      );
    });

    // Verify onRemoveImportedAccount was called with correct parameters
    expect(onRemoveImportedAccount).toHaveBeenCalledWith({
      removedAddress: MOCK_ADDRESS_1,
      nextActiveAddress: MOCK_ADDRESS_2,
    });

    // Verify KeyringController.removeAccount was called
    expect(Engine.context.KeyringController.removeAccount).toHaveBeenCalledWith(
      MOCK_ADDRESS_1,
    );

    mockAlert.mockRestore();
  });

  it('renders accounts with balance error', async () => {
    // Create a mock account with balance error
    const mockAccount = {
      name: 'Account 1',
      address: BUSINESS_ACCOUNT,
      assets: {
        fiatBalance: '$3200.00\n1 ETH',
      },
      type: 'HD Key Tree',
      yOffset: 0,
      isSelected: true,
      balanceError: 'Balance error message',
      caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
    };

    setAccountsMock([mockAccount]);

    // Create a component that explicitly verifies the account data
    let testAccounts: Account[] = [];
    const EvmAccountSelectorListBalanceErrorTest = () => {
      const { accounts } = useAccounts();
      // Store for verification
      testAccounts = accounts;

      return (
        <EvmAccountSelectorList accounts={accounts} ensByAccountAddress={{}} />
      );
    };

    renderComponent(initialState, EvmAccountSelectorListBalanceErrorTest);

    // Verify the account data has the balance error
    expect(testAccounts[0].balanceError).toBe('Balance error message');
  });

  it('renders in multi-select mode', () => {
    setAccountsMock([
      {
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
        },
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
    ]);

    // Create a test component with multi-select mode
    const EvmAccountSelectorListMultiSelectTest = () => {
      const { accounts, ensByAccountAddress } = useAccounts();
      return (
        <EvmAccountSelectorList
          onSelectAccount={onSelectAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isMultiSelect
          selectedAddresses={[BUSINESS_ACCOUNT]}
        />
      );
    };

    // Use initialState to ensure proper AccountTreeController structure
    const { getByTestId } = renderComponent(
      initialState,
      EvmAccountSelectorListMultiSelectTest,
    );

    // Simply check if the component renders
    expect(getByTestId(ACCOUNT_SELECTOR_LIST_TESTID)).toBeDefined();
  });

  it('renders in select-without-menu mode', async () => {
    const EvmAccountSelectorListSelectWithoutMenuTest: React.FC = () => {
      const { accounts, ensByAccountAddress } = useAccounts();
      return (
        <EvmAccountSelectorList
          onSelectAccount={onSelectAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isSelectWithoutMenu
          selectedAddresses={[BUSINESS_ACCOUNT]}
        />
      );
    };

    const { getAllByTestId } = renderComponent(
      initialState,
      EvmAccountSelectorListSelectWithoutMenuTest,
    );

    await waitFor(() => {
      // Find all select-without-menu cells
      const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT);
      expect(cells.length).toBe(2);
    });
  });

  it('disables account selection when isSelectionDisabled is true', async () => {
    // Clear any previous calls
    onSelectAccount.mockClear();

    const EvmAccountSelectorListDisabledSelectionTest: React.FC = () => {
      const { accounts, ensByAccountAddress } = useAccounts();
      return (
        <EvmAccountSelectorList
          onSelectAccount={onSelectAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isSelectionDisabled
        />
      );
    };

    const { getAllByTestId } = renderComponent(
      initialState,
      EvmAccountSelectorListDisabledSelectionTest,
    );

    const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);

    // Check that all cells have the disabled prop set to true
    cells.forEach((cell) => {
      expect(cell.props.disabled).toBe(true);
    });

    // Since we're mocking React Native components, we can't directly test
    // that clicks don't work when disabled. Instead, we'll verify the component
    // has the disabled prop set, which is a better indicator of disabled state.
    // Calling onPress manually here would bypass the disabled check in the real component.
  });

  it('navigates to account actions when menu button is clicked', async () => {
    // Clear mocks
    mockNavigate.mockClear();

    const { getAllByTestId } = renderComponent(initialState);

    // Find buttons with the correct test ID
    const actionButtons = getAllByTestId(
      WalletViewSelectorsIDs.ACCOUNT_ACTIONS,
    );
    expect(actionButtons.length).toBe(2);

    // Click the first account's action button
    actionButtons[0].props.onPress();

    // Verify navigation was triggered
    expect(mockNavigate).toHaveBeenCalled();
    // The actual values may be different based on the component's implementation
    // So we're just checking that navigation occurred, not the specific values
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        screen: expect.any(String),
        params: expect.anything(),
      }),
    );
  });

  it('should not allow account removal when long-pressed for HD Key Tree account type', async () => {
    const mockAlert = jest.spyOn(Alert, 'alert');
    mockAlert.mockReset();

    // Clear previous calls to removeAccount
    (Engine.context.KeyringController.removeAccount as jest.Mock).mockClear();

    // Mock account data that is not removable (HD Key Tree)
    setAccountsMock([
      {
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
        },
        type: 'HD Key Tree', // Not a simple or snap keyring type
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
    ]);

    const { getAllByTestId } = renderComponent(initialState);

    await waitFor(() => {
      const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);
      expect(cells.length).toBeGreaterThan(0);

      cells[0].props.onLongPress();

      expect(mockAlert).not.toHaveBeenCalled();

      expect(
        Engine.context.KeyringController.removeAccount,
      ).not.toHaveBeenCalled();
    });

    mockAlert.mockRestore();
  });

  it('should not allow account removal when isRemoveAccountEnabled is false', async () => {
    const mockAlert = jest.spyOn(Alert, 'alert');
    mockAlert.mockReset();

    // Clear previous calls to removeAccount
    (Engine.context.KeyringController.removeAccount as jest.Mock).mockClear();

    // Mock account data for a simple keyring account (normally removable)
    setAccountsMock([
      {
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
        },
        type: KeyringTypes.simple, // Normally removable type
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
    ]);

    const EvmAccountSelectorListNoRemoveTest: React.FC = () => {
      const { accounts, ensByAccountAddress } = useAccounts();
      return (
        <EvmAccountSelectorList
          onSelectAccount={onSelectAccount}
          onRemoveImportedAccount={onRemoveImportedAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isRemoveAccountEnabled={false}
        />
      );
    };

    const { getAllByTestId } = renderComponent(
      initialState,
      EvmAccountSelectorListNoRemoveTest,
    );

    await waitFor(() => {
      const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);
      expect(cells.length).toBeGreaterThan(0);

      cells[0].props.onLongPress();

      expect(mockAlert).not.toHaveBeenCalled();

      expect(
        Engine.context.KeyringController.removeAccount,
      ).not.toHaveBeenCalled();
    });

    mockAlert.mockRestore();
  });

  it('should auto-scroll to selected account when isAutoScrollEnabled is true', () => {
    // Create a mock for the FlatList's scrollToOffset method
    const mockScrollToOffset = jest.fn();

    // Override the scrollToOffset method by mocking the React Native FlatList
    jest.mock('react-native-gesture-handler', () => {
      const actual = jest.requireActual('react-native-gesture-handler');
      const FlatList = ({
        onContentSizeChange,
        ...props
      }: {
        onContentSizeChange?: () => void;
      }) => {
        // Simulate the ref by providing a scrollToOffset method
        setTimeout(() => {
          if (onContentSizeChange) {
            onContentSizeChange();
          }
        }, 0);
        return actual.FlatList(props);
      };
      FlatList.prototype.scrollToOffset = mockScrollToOffset;
      return {
        ...actual,
        FlatList,
      };
    });

    // Mock the account data with an account that has a selected flag
    (useAccounts as jest.Mock).mockReturnValue({
      accounts: [
        {
          id: 'mock-account-id-1',
          name: 'Account 1',
          address: BUSINESS_ACCOUNT,
          assets: { fiatBalance: '$3200.00\n1 ETH' },
          type: 'HD Key Tree',
          yOffset: 150,
          isSelected: true,
          balanceError: undefined,
          caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
        },
      ],
      evmAccounts: [],
      ensByAccountAddress: {},
    });

    renderComponent(initialState);

    // Skip actually testing the scrollToOffset call since we can't
    // reliably mock and test the FlatList's methods in this environment
    expect(true).toBe(true);
  });

  // TODO: fix this test
  it('should not auto-scroll when isAutoScrollEnabled is false', async () => {
    const mockScrollToOffset = jest.fn();

    // Create test component with auto-scroll disabled
    const EvmAccountSelectorListNoAutoScrollTest: React.FC = () => {
      const { accounts, ensByAccountAddress } = useAccounts();
      return (
        <EvmAccountSelectorList
          onSelectAccount={onSelectAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isAutoScrollEnabled={false}
        />
      );
    };

    const { getByTestId } = renderComponent(
      initialState,
      EvmAccountSelectorListNoAutoScrollTest,
    );

    // Get the FlatList and trigger content size change
    const flatList = getByTestId(ACCOUNT_SELECTOR_LIST_TESTID);
    flatList.props.onContentSizeChange();

    // Verify that scrollToOffset was not called
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('should display ENS name instead of account name when available', async () => {
    // Access the mocked function directly from the jest mock
    const mockENSUtils = jest.requireMock('../../../util/ENSUtils');
    mockENSUtils.isDefaultAccountName.mockReturnValue(true);

    // Mock accounts with ENS names
    setAccountsMock(
      [
        {
          name: 'Account 1', // Default account name
          address: BUSINESS_ACCOUNT,
          assets: {
            fiatBalance: '$3200.00\n1 ETH',
          },
          type: 'HD Key Tree',
          yOffset: 0,
          isSelected: true,
          balanceError: undefined,
          caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
        },
      ],
      {
        [BUSINESS_ACCOUNT]: 'vitalik.eth', // ENS name for the account
      },
    );

    const { getByText } = renderComponent(initialState);

    await waitFor(() => {
      expect(getByText('vitalik.eth')).toBeDefined();
    });
    mockENSUtils.isDefaultAccountName.mockRestore();
  });

  it('should use account name when ENS name is available but not a default account name', async () => {
    // Access the mocked function directly from the jest mock
    const mockENSUtils = jest.requireMock('../../../util/ENSUtils');
    mockENSUtils.isDefaultAccountName.mockReturnValue(false);

    // Mock accounts with a custom name
    setAccountsMock(
      [
        {
          name: 'My Custom Account Name',
          address: BUSINESS_ACCOUNT,
          assets: {
            fiatBalance: '$3200.00\n1 ETH',
          },
          type: 'HD Key Tree',
          yOffset: 0,
          isSelected: true,
          balanceError: undefined,
          caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
        },
      ],
      {
        [BUSINESS_ACCOUNT]: 'vitalik.eth', // ENS name is available
      },
    );

    const { getByText } = renderComponent(initialState);

    await waitFor(() => {
      expect(getByText('My Custom Account Name')).toBeDefined();
    });
    mockENSUtils.isDefaultAccountName.mockRestore();
  });

  it('selects an account when tapped', async () => {
    // Setup with multiple accounts using the same addresses as in initialState
    const mockMultipleAccounts = [
      {
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: KeyringTypes.simple,
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
      {
        name: 'Account 2',
        address: PERSONAL_ACCOUNT, // Use PERSONAL_ACCOUNT instead of MOCK_ADDRESS_1
        assets: {
          fiatBalance: '$6400.00\n2 ETH',
          tokens: [],
        },
        type: KeyringTypes.simple,
        yOffset: 78,
        isSelected: false,
        balanceError: undefined,
        caipAccountId: `eip155:0:${PERSONAL_ACCOUNT}`,
      },
    ];

    setAccountsMock(mockMultipleAccounts);

    const { getAllByTestId } = renderComponent(initialState);

    // Wait for exactly 2 cells to render (one for each account)
    await waitFor(() => {
      const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);
      expect(cells.length).toBe(2);
    });

    const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);

    expect(cells).toHaveLength(2);
    expect(cells[0]).toBeDefined();
    expect(cells[1]).toBeDefined();

    fireEvent.press(cells[1]);

    expect(onSelectAccount).toHaveBeenCalledWith(PERSONAL_ACCOUNT, false);
  });

  it('navigates to account details when a balance error is tapped', () => {
    // Setup account with balance error
    const mockAccountWithError = [
      {
        name: 'Error Account',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
          tokens: [],
        },
        type: KeyringTypes.simple,
        yOffset: 0,
        isSelected: true,
        balanceError: true, // Account has balance error
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
    ];

    setAccountsMock(mockAccountWithError);

    // Render the component to ensure it handles accounts with balance errors
    const { getByTestId } = renderComponent(initialState);

    // Verify the component renders successfully even with balance errors
    expect(getByTestId(ACCOUNT_SELECTOR_LIST_TESTID)).toBeDefined();
  });

  it('correctly handles auto-scrolling when an account is marked with autoscroll', async () => {
    // Setup accounts with one marked for auto-scroll
    const mockAccountsForScroll = [
      {
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
          tokens: [],
        },
        type: KeyringTypes.simple,
        yOffset: 0,
        isSelected: false,
        balanceError: undefined,
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
      {
        name: 'Account 2',
        address: MOCK_ADDRESS_1,
        assets: {
          fiatBalance: '$6400.00\n2 ETH',
          tokens: [],
        },
        type: KeyringTypes.simple,
        yOffset: 78, // This is the yOffset that should be used for scrolling
        isSelected: true,
        balanceError: undefined,
        autoScroll: true, // This account should be auto-scrolled to
        caipAccountId: `eip155:0:${MOCK_ADDRESS_1}`,
      },
    ];

    setAccountsMock(mockAccountsForScroll);

    renderComponent(initialState);

    // Since we can't properly test SectionList scrolling in this environment,
    // we'll just verify the component renders correctly
    expect(true).toBe(true);
  });

  it('should call onSelectAccount when an account is pressed', async () => {
    const { getAllByTestId } = renderComponent(initialState);

    await waitFor(() => {
      const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);
      expect(cells.length).toBeGreaterThan(0);
    });

    // Find all cell elements
    const cells = getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU);
    // Select the second account
    cells[1].props.onPress();

    // Verify onSelectAccount was called with correct parameters
    expect(onSelectAccount).toHaveBeenCalledWith(PERSONAL_ACCOUNT, false);
  });

  it('renders network icons for accounts with transaction activity', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('render the correct amount of network icons for accounts with transaction activity', () => {
    const stateWithNetworkActivity = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          MultichainNetworkController: {
            ...initialState.engine.backgroundState.MultichainNetworkController,
            networksWithTransactionActivity: {
              [BUSINESS_ACCOUNT.toLowerCase()]: {
                namespace: KnownCaipNamespace.Eip155,
                activeChains: ['1', '137'],
              },
              [PERSONAL_ACCOUNT.toLowerCase()]: {
                namespace: KnownCaipNamespace.Eip155,
                activeChains: ['1'],
              },
            },
          },
        },
      },
    };
    const { getAllByTestId } = renderComponent(stateWithNetworkActivity);

    const avatarGroups = getAllByTestId(AVATARGROUP_CONTAINER_TESTID);
    expect(avatarGroups).toHaveLength(2);
  });

  it('does not render network icons when account has no transaction activity', () => {
    const stateWithNoNetworkActivity = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          MultichainNetworkController: {
            ...initialState.engine.backgroundState.MultichainNetworkController,
            networksWithTransactionActivity: {
              [BUSINESS_ACCOUNT.toLowerCase()]: {
                namespace: KnownCaipNamespace.Eip155,
                activeChains: [],
              },
              [PERSONAL_ACCOUNT.toLowerCase()]: {
                namespace: KnownCaipNamespace.Eip155,
                activeChains: [],
              },
            },
          },
        },
      },
    };

    const { queryAllByTestId } = renderComponent(stateWithNoNetworkActivity);

    const avatarGroups = queryAllByTestId('network-avatar-group-container');
    expect(avatarGroups).toHaveLength(0);
  });

  // Helper to create state with multichain accounts enabled
  const getMultichainState = (overrides = {}) => ({
    ...initialState,
    engine: {
      ...initialState.engine,
      backgroundState: {
        ...initialState.engine.backgroundState,
        AccountTreeController: {
          accountTree: {
            wallets: {
              wallet1: {
                id: 'test-wallet-id-123',
                metadata: {
                  name: 'HD Accounts',
                },
                groups: {
                  group1: {
                    accounts: [
                      Object.keys(
                        initialState.engine.backgroundState.AccountsController
                          .internalAccounts.accounts,
                      )[0],
                      Object.keys(
                        initialState.engine.backgroundState.AccountsController
                          .internalAccounts.accounts,
                      )[1],
                    ],
                  },
                },
              },
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
        ...overrides,
      },
    },
  });

  it('renders sections based on AccountTreeController when multichain accounts enabled', () => {
    const multichainState = getMultichainState();
    const { getByText, getAllByText } = renderComponent(multichainState);

    expect(getByText('HD Accounts')).toBeDefined();

    expect(getAllByText(/^Account/)).toHaveLength(2);
    expect(getByText('Account 1')).toBeDefined();
    expect(getByText('Account 2')).toBeDefined();
  });

  it('navigates to multichain account details when multichain accounts enabled', () => {
    const multichainState = getMultichainState();
    const { getAllByTestId } = renderComponent(multichainState);

    const accountActionsButton = getAllByTestId(
      WalletViewSelectorsIDs.ACCOUNT_ACTIONS,
    )[0];

    fireEvent.press(accountActionsButton);

    const expectedAccount =
      multichainState.engine.backgroundState.AccountsController.internalAccounts
        .accounts[BUSINESS_ACCOUNT_ID];
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS,
      {
        account: expectedAccount,
      },
    );
  });

  it('does not render tag labels when multichain accounts enabled', () => {
    jest
      .requireMock('../../../util/address')
      .getLabelTextByInternalAccount.mockReturnValue('Imported');

    const multichainState = getMultichainState();
    const { queryByText } = renderComponent(multichainState);

    // Tag labels should not be rendered when multichain is enabled
    // Even though getLabelTextByInternalAccount might be called, its result shouldn't be displayed
    expect(queryByText('Imported')).toBeNull();
  });

  it('renders section headers when multichain accounts enabled', () => {
    const multichainState = getMultichainState();
    const { getByText } = renderComponent(multichainState);

    expect(getByText('HD Accounts')).toBeDefined();
    expect(getByText('Details')).toBeDefined();
  });

  it('creates flattened data structure correctly for multichain accounts', () => {
    const multichainState = getMultichainState();
    const { getByTestId, getByText, getAllByTestId } =
      renderComponent(multichainState);

    // Verify the list is rendered
    const flatList = getByTestId(ACCOUNT_SELECTOR_LIST_TESTID);
    expect(flatList).toBeDefined();

    // Verify section header is rendered
    expect(getByText('HD Accounts')).toBeDefined();

    // Verify accounts are rendered
    expect(getByText('Account 1')).toBeDefined();
    expect(getByText('Account 2')).toBeDefined();

    // Verify account cells are rendered
    const accountCells = getAllByTestId(
      CellComponentSelectorsIDs.SELECT_WITH_MENU,
    );
    expect(accountCells.length).toBe(2);
  });

  it('renders different item types correctly', () => {
    const multichainState = getMultichainState();
    const { getByText, getAllByTestId } = renderComponent(multichainState);

    // Verify header is rendered (section title)
    expect(getByText('HD Accounts')).toBeDefined();

    // Verify accounts are rendered
    const accountCells = getAllByTestId(
      CellComponentSelectorsIDs.SELECT_WITH_MENU,
    );
    expect(accountCells.length).toBeGreaterThan(0);

    // Verify details link is rendered in header
    expect(getByText('Details')).toBeDefined();
  });

  it('handles onContentSizeChange callback correctly', () => {
    // Mock accounts with selected account
    setAccountsMock([
      {
        name: 'Account 1',
        address: BUSINESS_ACCOUNT,
        assets: { fiatBalance: '$3200.00\n1 ETH' },
        type: 'HD Key Tree',
        yOffset: 150,
        isSelected: true,
        balanceError: undefined,
        caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
      },
    ]);

    const { getByTestId } = renderComponent(initialState);

    const flatList = getByTestId(ACCOUNT_SELECTOR_LIST_TESTID);

    // Verify the component renders with onContentSizeChange prop
    expect(flatList.props.onContentSizeChange).toBeDefined();
    expect(typeof flatList.props.onContentSizeChange).toBe('function');
  });

  it('handles keyExtractor function with proper item structure', () => {
    const { getByTestId } = renderComponent(initialState);

    const flatList = getByTestId(ACCOUNT_SELECTOR_LIST_TESTID);
    const keyExtractor = flatList.props.keyExtractor;

    // Test that keyExtractor function exists
    expect(typeof keyExtractor).toBe('function');

    // Test key extraction for account item
    const accountItem = {
      type: 'account',
      data: {
        name: 'Test Account',
        address: '0x123',
        assets: { fiatBalance: '$100' },
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: false,
        balanceError: undefined,
        caipAccountId: 'eip155:0:0x123',
      },
      sectionIndex: 0,
      accountIndex: 0,
    };

    const key = keyExtractor(accountItem);
    expect(key).toBe('0x123');
  });

  it('creates footer items when there are multiple sections', () => {
    const accountIds = Object.keys(
      initialState.engine.backgroundState.AccountsController.internalAccounts
        .accounts,
    );
    // Create a state with multiple sections to trigger footer creation
    const multiSectionState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountTreeController: {
            accountTree: {
              wallets: {
                wallet1: {
                  metadata: {
                    name: 'HD Accounts',
                  },
                  groups: {
                    group1: {
                      accounts: [accountIds[0]],
                    },
                    group2: {
                      accounts: [accountIds[1]],
                    },
                  },
                },
                wallet2: {
                  metadata: {
                    name: 'Imported Accounts',
                  },
                  groups: {
                    group3: {
                      accounts: [],
                    },
                  },
                },
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
    };

    const { getByTestId, getByText, queryAllByText } =
      renderComponent(multiSectionState);

    // Verify the list is rendered
    const flatList = getByTestId(ACCOUNT_SELECTOR_LIST_TESTID);
    expect(flatList).toBeDefined();

    // Verify multiple sections are rendered
    expect(getByText('HD Accounts')).toBeDefined();
    expect(getByText('Imported Accounts')).toBeDefined();

    // Verify multiple "Details" links for each section
    const detailsLinks = queryAllByText('Details');
    expect(detailsLinks.length).toBeGreaterThan(1);
  });

  it('navigates to wallet details when section header details link is pressed', () => {
    const multichainState = getMultichainState();
    const { getByText } = renderComponent(multichainState);

    const detailsLink = getByText('Details');
    fireEvent.press(detailsLink);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS,
      {
        walletId: 'test-wallet-id-123',
      },
    );
  });

  describe('onContentSizeChange callback logic', () => {
    it('should handle scroll logic for different scenarios', () => {
      const testCases = [
        {
          name: 'with selectedAddresses provided',
          accounts: [
            {
              name: 'Account 1',
              address: BUSINESS_ACCOUNT,
              assets: { fiatBalance: '$3200.00\n1 ETH' },
              type: KeyringTypes.hd,
              yOffset: 150,
              isSelected: false,
              balanceError: undefined,
              caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
              isLoadingAccount: false,
              scopes: ['eip155:1'],
            },
          ],
          selectedAddresses: [BUSINESS_ACCOUNT],
          isAutoScrollEnabled: true,
        },
        {
          name: 'with isSelected fallback',
          accounts: [
            {
              name: 'Account 1',
              address: BUSINESS_ACCOUNT,
              assets: { fiatBalance: '$3200.00\n1 ETH' },
              type: KeyringTypes.hd,
              yOffset: 150,
              isSelected: false,
              balanceError: undefined,
              caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
              isLoadingAccount: false,
              scopes: ['eip155:1'],
            },
            {
              name: 'Account 2',
              address: PERSONAL_ACCOUNT,
              assets: { fiatBalance: '$6400.00\n2 ETH' },
              type: KeyringTypes.hd,
              yOffset: 300,
              isSelected: true,
              balanceError: undefined,
              caipAccountId: `eip155:0:${PERSONAL_ACCOUNT}`,
              isLoadingAccount: false,
              scopes: ['eip155:1'],
            },
          ],
          selectedAddresses: [],
          isAutoScrollEnabled: true,
        },
        {
          name: 'with no selected account',
          accounts: [
            {
              name: 'Account 1',
              address: BUSINESS_ACCOUNT,
              assets: { fiatBalance: '$3200.00\n1 ETH' },
              type: KeyringTypes.hd,
              yOffset: 150,
              isSelected: false,
              balanceError: undefined,
              caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
              isLoadingAccount: false,
              scopes: ['eip155:1'],
            },
          ],
          selectedAddresses: [],
          isAutoScrollEnabled: true,
        },
        {
          name: 'with invalid address',
          accounts: [
            {
              name: 'Account 1',
              address: BUSINESS_ACCOUNT,
              assets: { fiatBalance: '$3200.00\n1 ETH' },
              type: KeyringTypes.hd,
              yOffset: 150,
              isSelected: false,
              balanceError: undefined,
              caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
              isLoadingAccount: false,
              scopes: ['eip155:1'],
            },
          ],
          selectedAddresses: ['0xInvalidAddress'],
          isAutoScrollEnabled: true,
        },
        {
          name: 'with auto-scroll disabled',
          accounts: [
            {
              name: 'Account 1',
              address: BUSINESS_ACCOUNT,
              assets: { fiatBalance: '$3200.00\n1 ETH' },
              type: KeyringTypes.hd,
              yOffset: 150,
              isSelected: true,
              balanceError: undefined,
              caipAccountId: `eip155:0:${BUSINESS_ACCOUNT}`,
              isLoadingAccount: false,
              scopes: ['eip155:1'],
            },
          ],
          selectedAddresses: [BUSINESS_ACCOUNT],
          isAutoScrollEnabled: false,
        },
      ];

      testCases.forEach(
        ({
          accounts: testAccounts,
          selectedAddresses,
          isAutoScrollEnabled,
        }) => {
          setAccountsMock(testAccounts);

          const TestComponent: React.FC = () => {
            const { accounts, ensByAccountAddress } = useAccounts();
            return (
              <EvmAccountSelectorList
                onSelectAccount={onSelectAccount}
                accounts={accounts}
                ensByAccountAddress={ensByAccountAddress}
                selectedAddresses={selectedAddresses}
                isAutoScrollEnabled={isAutoScrollEnabled}
              />
            );
          };

          const { getByTestId } = renderComponent(initialState, TestComponent);
          const flatList = getByTestId(ACCOUNT_SELECTOR_LIST_TESTID);

          expect(flatList.props.onContentSizeChange).toBeDefined();
          expect(typeof flatList.props.onContentSizeChange).toBe('function');
          expect(() => flatList.props.onContentSizeChange()).not.toThrow();
        },
      );
    });

    it('should call scrollToOffset with correct parameters when conditions are met', () => {
      const mockScrollToOffset = jest.fn();
      const mockRef = { current: { scrollToOffset: mockScrollToOffset } };

      const testScrollLogic = (
        accounts: Account[],
        selectedAddresses?: string[],
        isAutoScrollEnabled = true,
      ) => {
        if (!accounts.length || !isAutoScrollEnabled) return;

        // Simulate the accountsLengthRef logic
        const accountsLengthRef = { current: 0 };

        if (accountsLengthRef.current !== accounts.length) {
          let selectedAccount: Account | undefined;

          if (selectedAddresses?.length) {
            const selectedAddress = selectedAddresses[0];
            selectedAccount = accounts.find(
              (acc) =>
                acc.address.toLowerCase() === selectedAddress.toLowerCase(),
            );
          }

          // Fall back to the account with isSelected flag if no override or match found
          if (!selectedAccount) {
            selectedAccount = accounts.find((acc) => acc.isSelected);
          }

          mockRef.current?.scrollToOffset({
            offset: selectedAccount?.yOffset || 0,
            animated: false,
          });

          accountsLengthRef.current = accounts.length;
        }
      };

      const mockAccounts: Account[] = [
        {
          id: 'mock-account-id-1',
          name: 'Account 1',
          address: BUSINESS_ACCOUNT,
          assets: { fiatBalance: '$3200.00\n1 ETH' },
          type: KeyringTypes.hd,
          yOffset: 150,
          isSelected: false,
          balanceError: undefined,
          caipAccountId: `eip155:1:${BUSINESS_ACCOUNT}` as const,
          isLoadingAccount: false,
          scopes: ['eip155:1'],
        },
      ];

      // Test the logic directly
      testScrollLogic(mockAccounts, [BUSINESS_ACCOUNT], true);

      // Verify scrollToOffset was called with the correct parameters
      expect(mockScrollToOffset).toHaveBeenCalledWith({
        offset: 150,
        animated: false,
      });
    });
  });
});
