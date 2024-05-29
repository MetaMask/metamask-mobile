import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { waitFor, within } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountSelectorList from './AccountSelectorList';
import { useAccounts } from '../../../components/hooks/useAccounts';
import { View } from 'react-native';
import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from '../../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { regex } from '../../../../app/util/regex';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { toChecksumAddress } from 'ethereumjs-util';

const MOCK_ACCOUNT_ADDRESSES = Object.values(
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
).map((account) => account.address);

const BUSINESS_ACCOUNT = toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[0]);
const PERSONAL_ACCOUNT = toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[1]);

jest.mock('../../../util/address', () => {
  const actual = jest.requireActual('../../../util/address');
  return {
    ...actual,
    getLabelTextByAddress: jest.fn(),
  };
});

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      NetworkController: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
          chainId: '0x1',
        },
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
        identities: {
          [BUSINESS_ACCOUNT]: {
            address: BUSINESS_ACCOUNT,
            name: 'Business Account',
          },
          [PERSONAL_ACCOUNT]: {
            address: PERSONAL_ACCOUNT,
            name: 'Personal Account',
          },
        },
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

const AccountSelectorListUseAccounts = () => {
  const { accounts, ensByAccountAddress } = useAccounts();
  return (
    <AccountSelectorList
      onSelectAccount={onSelectAccount}
      onRemoveImportedAccount={onRemoveImportedAccount}
      accounts={accounts}
      ensByAccountAddress={ensByAccountAddress}
      isRemoveAccountEnabled
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
  state: any = {},
  AccountSelectorListTest = AccountSelectorListUseAccounts,
) => renderWithProvider(<AccountSelectorListTest />, { state });

describe('AccountSelectorList', () => {
  beforeEach(() => {
    onSelectAccount.mockClear();
    onRemoveImportedAccount.mockClear();
  });

  it('should render correctly', async () => {
    const { toJSON } = renderComponent(initialState);
    await waitFor(() => expect(toJSON()).toMatchSnapshot());
  });

  it('should render all accounts with balances', async () => {
    const { queryByTestId, getAllByTestId, toJSON } =
      renderComponent(initialState);

    await waitFor(async () => {
      const businessAccountItem = await queryByTestId(
        `${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${BUSINESS_ACCOUNT}`,
      );
      const personalAccountItem = await queryByTestId(
        `${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${PERSONAL_ACCOUNT}`,
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
        `${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${PERSONAL_ACCOUNT}`,
      );

      expect(within(businessAccountItem).getByText(regex.eth(2))).toBeDefined();
      expect(
        within(businessAccountItem).getByText(regex.usd(6400)),
      ).toBeDefined();

      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should render all accounts with right acessory', async () => {
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
});
