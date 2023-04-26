import React from 'react';
import AssetOverview from './';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  settings: {
    primaryCurrency: 'ETH',
  },
};
const asset = {
  balance: 4,
  balanceFiat: 1500,
  logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
  symbol: 'ETH',
  name: 'Ethereum',
};
const store = mockStore(initialState);

describe('AssetOverview', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AssetOverview asset={asset} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
