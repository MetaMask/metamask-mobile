import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { waitFor, within } from '@testing-library/react-native';
import { Alert, View } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountSelectorList from './AccountSelectorList';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { regex } from '../../../../app/util/regex';
import {
  createMockAccountsControllerState,
  createMockAccountsControllerStateWithSnap,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { AccountSelectorListProps } from './AccountSelectorList.types';
import Engine from '../../../core/Engine';
import { CellComponentSelectorsIDs } from '../../../../e2e/selectors/wallet/CellComponent.selectors';
import { KeyringTypes as KeyringTypesEnum } from '@metamask/keyring-controller';

const BUSINESS_ACCOUNT = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const PERSONAL_ACCOUNT = '0xd018538C87232FF95acbCe4870629b75640a78E7';

// Create mock accounts controller state
const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  BUSINESS_ACCOUNT,
  PERSONAL_ACCOUNT,
]);

// Mock for useAccounts
jest.mock('../../../components/hooks/useAccounts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { KeyringTypes } = require('@metamask/keyring-controller');
  // Use the KeyringTypes that was already imported at the top level
  const mockAccounts = [
    {
      name: 'Account 1',
      address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      type: KeyringTypes.hd,
      yOffset: 0,
      isSelected: true,
      assets: {
        fiatBalance: '$3200.00\n1 ETH',
      },
      balanceError: undefined,
    },
    {
      name: 'Account 2',
      address: '0xd018538C87232FF95acbCe4870629b75640a78E7',
      type: KeyringTypes.hd,
      yOffset: 78,
      isSelected: false,
      assets: {
        fiatBalance: '$6400.00\n2 ETH',
      },
      balanceError: undefined,
    },
  ];

  const mockPrivateAccounts = mockAccounts.map((account) => ({
    ...account,
    assets: account.assets ? { fiatBalance: '••••••' } : undefined,
  }));

  const mockSingleBalanceAccounts = mockAccounts.map((account) => ({
    ...account,
    assets: account.isSelected ? account.assets : undefined,
  }));

  return {
    useAccounts: jest.fn(({ privacyMode } = {}) => {
      // Return different account data based on parameters
      const accounts = privacyMode ? mockPrivateAccounts : mockAccounts;

      return {
        accounts,
        evmAccounts: accounts,
        ensByAccountAddress: {},
      };
    }),
    mockAccounts,
    mockPrivateAccounts,
    mockSingleBalanceAccounts,
  };
});

// Mock for Engine
jest.mock('../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn((account) => {
    // Return different balances based on account address
    if (account.address === '0xd018538C87232FF95acbCe4870629b75640a78E7') {
      return {
        ethFiat: 6400,
        ethFiat1dAgo: 6400,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        totalNativeTokenBalance: '2',
        ticker: 'ETH',
      };
    }
    // Default for BUSINESS_ACCOUNT or any other account
    return {
      ethFiat: 3200,
      ethFiat1dAgo: 3200,
      tokenFiat: 0,
      tokenFiat1dAgo: 0,
      totalNativeTokenBalance: '1',
      ticker: 'ETH',
    };
  }),
  context: {
    KeyringController: {
      removeAccount: jest.fn(),
    },
    PermissionController: {
      state: {
        subjects: {},
      },
    },
  },
}));

// Mock for address
jest.mock('../../../util/address', () => {
  const actual = jest.requireActual('../../../util/address');
  return {
    ...actual,
    getLabelTextByAddress: jest.fn(),
  };
});

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

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
      AccountTrackerController: {
        accounts: {
          [BUSINESS_ACCOUNT]: { balance: '0xDE0B6B3A7640000' },
          [PERSONAL_ACCOUNT]: { balance: '0x1BC16D674EC80000' },
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
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const onSelectAccount = jest.fn();
const onRemoveImportedAccount = jest.fn();

// Mock imports from the mocked module
const mockUseAccounts = jest.requireMock(
  '../../../components/hooks/useAccounts',
);
const mockAccounts = mockUseAccounts.mockAccounts;
const mockPrivateAccounts = mockUseAccounts.mockPrivateAccounts;
const mockSingleBalanceAccounts = mockUseAccounts.mockSingleBalanceAccounts;

// Regular account selector with all accounts visible
const AccountSelectorListUseAccounts: React.FC<AccountSelectorListProps> = (
  props,
) => {
  const accounts = props.privacyMode ? mockPrivateAccounts : mockAccounts;

  return (
    <AccountSelectorList
      onSelectAccount={onSelectAccount}
      onRemoveImportedAccount={onRemoveImportedAccount}
      isRemoveAccountEnabled
      {...props}
      accounts={accounts}
      ensByAccountAddress={{}}
    />
  );
};

// Account selector with only selected account showing balance
const AccountSelectorListSingleBalance: React.FC<AccountSelectorListProps> = (
  props,
) => (
  <AccountSelectorList
    onSelectAccount={onSelectAccount}
    onRemoveImportedAccount={onRemoveImportedAccount}
    isRemoveAccountEnabled
    {...props}
    accounts={mockSingleBalanceAccounts}
    ensByAccountAddress={{}}
  />
);

const RIGHT_ACCESSORY_TEST_ID = 'right-accessory';

const AccountSelectorListRightAccessoryUseAccounts = () => (
  <AccountSelectorList
    renderRightAccessory={(address, name) => (
      <View testID={RIGHT_ACCESSORY_TEST_ID}>{`${address} - ${name}`}</View>
    )}
    isSelectionDisabled
    selectedAddresses={[]}
    accounts={mockAccounts}
    ensByAccountAddress={{}}
  />
);

const renderComponent = (
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any = {},
  AccountSelectorListTest = AccountSelectorListUseAccounts,
) => renderWithProvider(<AccountSelectorListTest {...state} />, { state });

describe('AccountSelectorList', () => {
  beforeEach(() => {
    onSelectAccount.mockClear();
    onRemoveImportedAccount.mockClear();
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

      expect(within(businessAccountItem).getByText(regex.eth(1))).toBeDefined();
      expect(
        within(businessAccountItem).getByText(regex.usd(3200)),
      ).toBeDefined();

      expect(within(personalAccountItem).getByText(regex.eth(2))).toBeDefined();
      expect(
        within(personalAccountItem).getByText(regex.usd(6400)),
      ).toBeDefined();

      const accounts = getAllByTestId(regex.accountBalance);
      expect(accounts.length).toBe(2);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should render all accounts but only the balance for selected account', async () => {
    const { queryByTestId, getAllByTestId, toJSON } = renderComponent(
      {
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            PreferencesController: {
              ...initialState.engine.backgroundState.PreferencesController,
              isMultiAccountBalancesEnabled: false,
            },
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          },
        },
      },
      AccountSelectorListSingleBalance,
    );

    await waitFor(async () => {
      const accounts = getAllByTestId(regex.accountBalance);
      expect(accounts.length).toBe(1);

      const businessAccountItem = await queryByTestId(
        `${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${BUSINESS_ACCOUNT}`,
      );

      expect(within(businessAccountItem).getByText(regex.eth(1))).toBeDefined();
      expect(
        within(businessAccountItem).getByText(regex.usd(3200)),
      ).toBeDefined();

      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('renders all accounts with right accessory', async () => {
    const { getAllByTestId, toJSON } = renderComponent(
      initialState,
      AccountSelectorListRightAccessoryUseAccounts,
    );

    await waitFor(() => {
      const rightAccessories = getAllByTestId(RIGHT_ACCESSORY_TEST_ID);
      expect(rightAccessories.length).toBe(2);

      expect(toJSON()).toMatchSnapshot();
    });
  });
  it('renders correct account names', async () => {
    const { getAllByTestId } = renderComponent(initialState);

    await waitFor(() => {
      const accountNameItems = getAllByTestId('cellbase-avatar-title');
      expect(within(accountNameItems[0]).getByText('Account 1')).toBeDefined();
      expect(within(accountNameItems[1]).getByText('Account 2')).toBeDefined();
    });
  });
  it('renders the snap name tag for Snap accounts', async () => {
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
  it('Text is not hidden when privacy mode is off', async () => {
    const state = {
      ...initialState,
      privacyMode: false,
    };

    const { queryByTestId } = renderComponent(state);

    await waitFor(() => {
      const businessAccountItem = queryByTestId(
        `${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${BUSINESS_ACCOUNT}`,
      );

      expect(within(businessAccountItem).getByText(regex.eth(1))).toBeDefined();
      expect(
        within(businessAccountItem).getByText(regex.usd(3200)),
      ).toBeDefined();

      expect(within(businessAccountItem).queryByText('••••••')).toBeNull();
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

      expect(within(businessAccountItem).queryByText(regex.eth(1))).toBeNull();
      expect(
        within(businessAccountItem).queryByText(regex.usd(3200)),
      ).toBeNull();

      expect(within(businessAccountItem).getByText('••••••')).toBeDefined();
    });
  });
  it('allows account removal for simple keyring type', async () => {
    jest.clearAllMocks();

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
        type: KeyringTypesEnum.simple,
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

    // Mock Alert.alert to directly call the removal handler
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        if (buttons && buttons.length > 1 && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

    const rendered = renderComponent(stateWithSimpleAccount);

    // Wait for component to render
    await waitFor(() => {
      expect(
        rendered.getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU)
          .length,
      ).toBeGreaterThan(0);
    });

    // Get the cells and trigger onLongPress on the first one
    const cells = rendered.getAllByTestId(
      CellComponentSelectorsIDs.SELECT_WITH_MENU,
    );
    cells[0].props.onLongPress();

    // Verify onRemoveImportedAccount was called with correct parameters
    expect(onRemoveImportedAccount).toHaveBeenCalledWith({
      removedAddress: BUSINESS_ACCOUNT,
    });

    // Verify KeyringController.removeAccount was called
    expect(Engine.context.KeyringController.removeAccount).toHaveBeenCalledWith(
      BUSINESS_ACCOUNT,
    );
  });
  it('allows account removal for snap keyring type', async () => {
    jest.clearAllMocks();

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

    // Mock Alert.alert to directly call the removal handler
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        if (buttons && buttons.length > 1 && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

    const rendered = renderComponent(stateWithSnapAccount);

    // Wait for component to render - just check for any UI element
    await waitFor(() => {
      expect(
        rendered.getAllByTestId(CellComponentSelectorsIDs.SELECT_WITH_MENU)
          .length,
      ).toBeGreaterThan(0);
    });

    // Find all elements with the test ID and use the first one
    const cells = rendered.getAllByTestId(
      CellComponentSelectorsIDs.SELECT_WITH_MENU,
    );
    expect(cells.length).toBeGreaterThan(0);

    // Trigger long press on the first cell
    cells[0].props.onLongPress();

    // Verify onRemoveImportedAccount was called with correct parameters
    expect(onRemoveImportedAccount).toHaveBeenCalledWith({
      removedAddress: MOCK_ADDRESS_1,
      nextActiveAddress: MOCK_ADDRESS_2,
    });

    // Verify KeyringController.removeAccount was called
    expect(Engine.context.KeyringController.removeAccount).toHaveBeenCalledWith(
      MOCK_ADDRESS_1,
    );
  });
});
