import React from 'react';
import AssetOverview from './AssetOverview';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { zeroAddress } from 'ethereumjs-util';

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
  isETH: true,
  balanceError: false,
  decimals: 18,
  address: zeroAddress(),
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
