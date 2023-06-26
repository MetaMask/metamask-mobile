import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { waitFor, within } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountSelectorList from './AccountSelectorList';
import { useAccounts } from '../../../components/hooks/useAccounts';
import { View } from 'react-native';
import { ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID } from '../../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
import {
  REGEX_1_ETH,
  REGEX_2ETH,
  REGEX_3200_USD,
  REGEX_6400_USD,
  REGEX_ACCOUNT_BALANCE,
} from 'app/util/regex';

const mockEngine = Engine;

jest.unmock('react-redux');

const BUSINESS_ACCOUNT = '0x1';
const PERSONAL_ACCOUNT = '0x2';

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            index: 0,
            accounts: [BUSINESS_ACCOUNT, PERSONAL_ACCOUNT],
          },
        ],
      },
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
          chainId: '1',
        },
      },
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
        conversionRate: 3200,
        currentCurrency: 'usd',
        nativeCurrency: 'ETH',
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

      expect(within(businessAccountItem).getByText(REGEX_1_ETH)).toBeDefined();
      expect(
        within(businessAccountItem).getByText(REGEX_3200_USD),
      ).toBeDefined();

      expect(within(personalAccountItem).getByText(REGEX_2ETH)).toBeDefined();
      expect(
        within(personalAccountItem).getByText(REGEX_6400_USD),
      ).toBeDefined();

      const accounts = getAllByTestId(REGEX_ACCOUNT_BALANCE);
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
        },
      },
    });

    await waitFor(async () => {
      const accounts = getAllByTestId(REGEX_ACCOUNT_BALANCE);
      expect(accounts.length).toBe(1);

      const businessAccountItem = await queryByTestId(
        `${ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${BUSINESS_ACCOUNT}`,
      );

      expect(within(businessAccountItem).getByText(/1 ETH/)).toBeDefined();
      expect(within(businessAccountItem).getByText(/\$3200/)).toBeDefined();

      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should render all accounts with right accessory', async () => {
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
