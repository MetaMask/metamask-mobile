import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import AddressList from '.';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

const BUSINESS_ACCOUNT = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const PERSONAL_ACCOUNT = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  BUSINESS_ACCOUNT,
  PERSONAL_ACCOUNT,
]);

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
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any) =>
  renderWithProvider(
    <AddressList
      onIconPress={() => null}
      onAccountLongPress={() => null}
      onAccountPress={() => null}
    />,
    { state },
  );

describe('AddressList', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });
});
