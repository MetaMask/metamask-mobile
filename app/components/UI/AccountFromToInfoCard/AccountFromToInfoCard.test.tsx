import React from 'react';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import AccountFromToInfoCard from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { Transaction } from './AccountFromToInfoCard.types';

const mockStore = configureMockStore();
const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 200,
          },
          '0x1': {
            balance: 200,
          },
        },
      },
      TokenBalancesController: {},
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          '0x0': {
            address: '0x0',
            name: 'Account 1',
          },
          '0x1': {
            address: '0x1',
            name: 'Account 2',
          },
        },
      },
      CurrencyRateController: {
        conversionRate: 10,
        currentCurrency: 'usd',
      },
      NetworkController: {
        provider: {
          ticker: 'eth',
        },
      },
      AddressBookController: {
        addressBook: {},
      },
    },
  },
};
const store = mockStore(initialState);

const transactionState: Transaction = {
  transaction: { from: '0x0', to: '0x1' },
  transactionTo: '0x1',
  selectedAsset: { isETH: true, address: '0x0', symbol: 'ETH', decimals: 8 },
  transactionToName: 'Account 2',
  transactionFromName: 'Account 1',
};

describe('AccountFromToInfoCard', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AccountFromToInfoCard transactionState={transactionState} />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });

  it('should match snapshot', async () => {
    const container = renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: initialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should render from address', async () => {
    const { findByText } = renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: initialState },
    );
    expect(await findByText('Account 1')).toBeDefined();
  });

  it('should render balance of from address', async () => {
    const { findByText } = renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: initialState },
    );
    expect(await findByText('Balance: < 0.00001 ETH')).toBeDefined();
  });

  it('should render to address', async () => {
    const { findByText } = renderWithProvider(
      <AccountFromToInfoCard transactionState={transactionState} />,
      { state: initialState },
    );
    expect(await findByText('0x1...0x1')).toBeDefined();
  });
});
