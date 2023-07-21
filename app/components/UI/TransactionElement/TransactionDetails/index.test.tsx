import React from 'react';
import TransactionDetails from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('TransactionDetails', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionDetails
          transactionObject={{
            networkID: '1',
            status: 'confirmed',
            transaction: {
              nonce: '',
            },
          }}
          transactionDetails={{
            renderFrom: '0x0',
            renderTo: '0x1',
            transactionHash: '0x2',
            renderValue: '2 TKN',
            renderGas: '21000',
            renderGasPrice: '2',
            renderTotalValue: '2 TKN / 0.001 ETH',
            renderTotalValueFiat: '',
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
