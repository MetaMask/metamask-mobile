import React from 'react';
import { render } from '@testing-library/react-native';
import AccountBackupStep1 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          chainId: '1',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('AccountBackupStep1', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AccountBackupStep1 />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
