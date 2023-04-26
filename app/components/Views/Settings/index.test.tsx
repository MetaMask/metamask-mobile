import React from 'react';
import { render } from '@testing-library/react-native';
import Settings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  user: { seedphraseBackedUp: true },
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'DuckDuckGo',
    useBlockieIcon: true,
  },
  engine: {
    backgroundState: {
      CurrencyRateController: { currentCurrency: 'USD' },
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
        },
      },
      PreferencesController: { selectedAddress: '0x0' },
    },
  },
};
const store = mockStore(initialState);

describe('Settings', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Settings />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
