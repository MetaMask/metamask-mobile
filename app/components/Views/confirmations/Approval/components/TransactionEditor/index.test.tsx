import React from 'react';
import TransactionEditor from '.';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  transactionState: {
    transaction: {
      value: 0,
      data: '0x0',
      gas: 21000,
      gasPrice: 1,
      from: '0x0',
      to: '0x1',
    },
  },
  settings: {
    primaryCurrency: 'fiat',
  },
};
const store = mockStore(initialState);

jest.mock('react-native-material-textfield', () => {
  const React = require('react');
  const { TextInput } = require('react-native');

  return {
    OutlinedTextField: React.forwardRef((props: any, ref: any) => (
      <TextInput ref={ref} {...props} />
    )),
  };
});

describe('TransactionEditor', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <TransactionEditor />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
