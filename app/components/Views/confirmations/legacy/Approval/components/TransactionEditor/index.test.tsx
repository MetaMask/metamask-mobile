import React from 'react';
import TransactionEditor from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  transaction: {
    value: 0,
    data: '0x0',
    gas: 0,
    gasPrice: 1,
    from: '0x0',
    to: '0x1',
  },
  settings: {
    primaryCurrency: 'fiat',
  },
};
const store = mockStore(initialState);

describe('TransactionEditor', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionEditor />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
