import React from 'react';
import AssetOverview from './AssetOverview';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  settings: {
    primaryCurrency: 'ETH',
  },
};
const asset = {
  balance: '400',
  balanceFiat: '1500',
  logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
  symbol: 'ETH',
  name: 'Ethereum',
  isETH: undefined,
  balanceError: null,
  decimals: 18,
  address: '0x123',
  aggregators: [],
  image: '',
};
const store = mockStore(initialState);

describe('AssetOverview', () => {
  it('should render correctly', () => {
    const navigateMock = jest.fn();
    const wrapper = shallow(
      <Provider store={store}>
        <AssetOverview asset={asset} navigation={{ navigate: navigateMock }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
