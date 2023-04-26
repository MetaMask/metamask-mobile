import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionHeader from './';
import configureMockStore from 'redux-mock-store';
import { ROPSTEN } from '../../../constants/network';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          type: ROPSTEN,
          nickname: 'Ropsten',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('TransactionHeader', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <TransactionHeader
          currentPageInformation={{ title: 'title', url: 'url' }}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
