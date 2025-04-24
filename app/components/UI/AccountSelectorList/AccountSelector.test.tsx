import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { waitFor, within } from '@testing-library/react-native';
import { Alert, AlertButton, View } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountSelectorList from './AccountSelectorList';
import { useAccounts } from '../../../components/hooks/useAccounts';
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

// eslint-disable-next-line import/no-namespace
import { KeyringTypes } from '@metamask/keyring-controller';

const BUSINESS_ACCOUNT = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const PERSONAL_ACCOUNT = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  BUSINESS_ACCOUNT,
  PERSONAL_ACCOUNT,
]);

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

// Mock useAccounts
jest.mock('../../../components/hooks/useAccounts', () => ({
  useAccounts: jest.fn().mockImplementation(() => ({
    accounts: [
      {
        name: 'Account 1',
        address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
        assets: {
          fiatBalance: '$3200.00\n1 ETH',
        },
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: true,
        balanceError: undefined,
      },
      {
        name: 'Account 2',
        address: '0xd018538C87232FF95acbCe4870629b75640a78E7',
        assets: {
          fiatBalance: '$6400.00\n2 ETH',
        },
        type: 'HD Key Tree',
        yOffset: 78,
        isSelected: false,
        balanceError: undefined,
      },
    ],
    evmAccounts: [],
    ensByAccountAddress: {},
  })),
}));

// Mock Engine
jest.mock('../../../core/Engine', () => ({
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
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const onSelectAccount = jest.fn();
const onRemoveImportedAccount = jest.fn();
const AccountSelectorListUseAccounts: React.FC<AccountSelectorListProps> = ({
  privacyMode = false,
}) => {
  if (privacyMode) {
    (useAccounts as jest.Mock).mockImplementationOnce(() => ({
      accounts: [
        {
          name: 'Account 1',
          address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
          assets: {
            fiatBalance: '$3200.00\n1 ETH',
          },
          type: 'HD Key Tree',
          yOffset: 0,
          isSelected: true,
          balanceError: undefined,
        },
        {
          name: 'Account 2',
          address: '0xd018538C87232FF95acbCe4870629b75640a78E7',
          assets: {
            fiatBalance: '$6400.00\n2 ETH',
          },
          type: 'HD Key Tree',
          yOffset: 78,
          isSelected: false,
          balanceError: undefined,
        },
      ],
      evmAccounts: [],
      ensByAccountAddress: {},
    }));
  }
  const { accounts, ensByAccountAddress } = useAccounts();
  return (
    <AccountSelectorList
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

const AccountSelectorListRightAccessoryUseAccounts = () => {
  const { accounts, ensByAccountAddress } = useAccounts();
  return (
    <AccountSelectorList
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
    const mockAlert = jest.spyOn(Alert, 'alert');
    mockAlert.mockReset();
    mockAlert.mockImplementation(
      (_title, _message, buttons?: AlertButton[]) => {
        // Simulate user clicking "Yes, remove it"
        buttons?.[1]?.onPress?.();
      },
    );

    // Mock account data for a simple keyring account
    (useAccounts as jest.Mock).mockImplementationOnce(() => ({
      accounts: [
        {
          name: 'Account 1',
          address: BUSINESS_ACCOUNT,
          assets: {
            fiatBalance: '$3200.00\n1 ETH',
          },
          type: KeyringTypes.simple, // Important: must be simple type for removal
          yOffset: 0,
          isSelected: true,
          balanceError: undefined,
        },
      ],
      evmAccounts: [],
      ensByAccountAddress: {},
    }));

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

    // Mock account data for a snap account
    (useAccounts as jest.Mock).mockImplementationOnce(() => ({
      accounts: [
        {
          name: 'Snap Account 1',
          address: MOCK_ADDRESS_1,
          assets: {
            fiatBalance: '$3200.00\n1 ETH',
          },
          type: KeyringTypes.snap, // Important: must be snap type for removal
          yOffset: 0,
          isSelected: true,
          balanceError: undefined,
        },
        {
          name: 'Snap Account 2',
          address: MOCK_ADDRESS_2,
          assets: {
            fiatBalance: '$6400.00\n2 ETH',
          },
          type: KeyringTypes.snap, // Important: must be snap type for removal
          yOffset: 78,
          isSelected: false,
          balanceError: undefined,
        },
      ],
      evmAccounts: [],
      ensByAccountAddress: {},
    }));

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
});
