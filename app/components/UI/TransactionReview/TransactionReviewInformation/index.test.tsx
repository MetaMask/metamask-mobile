import React from 'react';
import TransactionReviewInformation from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  transaction: {
    value: '',
    data: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: undefined,
    assetType: undefined,
  },
  settings: {
    primaryCurrency: 'ETH',
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
};
const store = mockStore(initialState);

describe('TransactionReviewInformation', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewInformation EIP1559GasData={{}} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
