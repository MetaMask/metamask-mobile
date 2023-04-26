import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import AccountRightButton from './';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      },
    },
  },
});

describe('AccountRightButton', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AccountRightButton />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
