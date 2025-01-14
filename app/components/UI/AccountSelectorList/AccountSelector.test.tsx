import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { waitFor, within } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountSelectorList from './AccountSelectorList';
import { useAccounts } from '../../../components/hooks/useAccounts';
import { View } from 'react-native';
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

// eslint-disable-next-line import/no-namespace
import * as Utils from '../../hooks/useAccounts/utils';

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
const AccountSelectorListUseAccounts: React.FC<AccountSelectorListProps> = ({
  privacyMode = false,
}) => {
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
    jest.spyOn(Utils, 'getAccountBalances').mockReturnValueOnce({
      balanceETH: '1',
      balanceFiat: '$3200.00',
      balanceWeiHex: '',
    });
    jest.spyOn(Utils, 'getAccountBalances').mockReturnValueOnce({
      balanceETH: '2',
      balanceFiat: '$6400.00',
      balanceWeiHex: '',
    });
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
    const { queryByTestId, getAllByTestId, toJSON } = renderComponent({
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
    });

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
});
