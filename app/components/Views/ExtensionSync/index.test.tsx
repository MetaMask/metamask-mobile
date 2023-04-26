import React from 'react';
import { render } from '@testing-library/react-native';
import ExtensionSync from './';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';

const mockStore = createMockStore();
const initialState = {
  user: {
    passwordSet: false,
    loadingSet: false,
    loadingMsg: '',
  },
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '',
      },
    },
  },
};
const store = mockStore(initialState);

describe('ExtensionSync', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ExtensionSync />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
