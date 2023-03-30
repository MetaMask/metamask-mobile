import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { act, waitFor, within } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountSelectorList from './AccountSelectorList';
import { useAccounts } from '../../../components/hooks/useAccounts';
import { View } from 'react-native';

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

const AccountSelectorListRightAccessoryUseAccounts = () => {
  const { accounts, ensByAccountAddress } = useAccounts();
  return (
    <AccountSelectorList
      renderRightAccessory={(address, name) => (
        <View testID="right-accessory">{`${address} - ${name}`}</View>
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render correctly', async () => {
    const { toJSON } = renderComponent(initialState);
    await act(async () => jest.runOnlyPendingTimers());
    await waitFor(() => expect(toJSON()).toMatchSnapshot());
  });

  it('should render all accounts with balances', async () => {
    const { getAllByTestId, toJSON } = renderComponent(initialState);
    await act(async () => jest.runOnlyPendingTimers());
    await waitFor(() => {
      const accounts = getAllByTestId('cell-account-select');
      expect(accounts.length).toBe(2);

      accounts.forEach(async (account) => {
        const { findByTestId } = within(account);
        const title = await findByTestId('cell-title');

        if (title === 'Business Account') {
          const balance = findByTestId('balance-label');
          expect(balance).toContain('1 ETH');
          expect(balance).toContain('3200$');
        }

        if (title === 'Personal Account') {
          const balance = findByTestId('balance-label');
          expect(balance).toContain('2 ETH');
          expect(balance).toContain('6300$');
        }

        expect(toJSON()).toMatchSnapshot();
      });
    });
  });

  it('should render all accounts but only the balance for selected account', async () => {
    const { getAllByTestId, toJSON } = renderComponent({
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

    await act(async () => jest.runOnlyPendingTimers());

    await waitFor(() => {
      const accounts = getAllByTestId('cell-account-select');
      expect(accounts.length).toBe(2);

      accounts.forEach(async (account) => {
        const { findByTestId } = within(account);
        const title = await findByTestId('cell-title');

        if (title === 'Business Account') {
          const balance = findByTestId('balance-label');
          expect(balance).toContain('1 ETH');
        }

        if (title === 'Personal Account') {
          const balance = findByTestId('balance-label');
          expect(balance).toBeFalsy();
        }
      });

      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should render all accounts with right acessory', async () => {
    const { getAllByTestId, toJSON } = renderComponent(
      initialState,
      AccountSelectorListRightAccessoryUseAccounts,
    );

    await act(async () => jest.runOnlyPendingTimers());

    await waitFor(() => {
      const accounts = getAllByTestId('cell-account-select');
      expect(accounts.length).toBe(2);

      const rightAccessories = getAllByTestId('right-accessory');
      expect(rightAccessories.length).toBe(2);

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
