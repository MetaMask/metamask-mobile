import React from 'react';
import TransactionDetails from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};
const store = mockStore(initialState);

describe('TransactionDetails', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionDetails
          //@ts-expect-error - TransactionDetails needs to be converted to typescript
          transactionObject={{
            networkID: '1',
            status: 'confirmed',
            transaction: {
              nonce: '',
            },
          }}
          //@ts-expect-error - TransactionDetails needs to be converted to typescript
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
