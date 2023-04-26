import React from 'react';
import { render } from '@testing-library/react-native';
import LockScreen from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: false,
  },
};
const store = mockStore(initialState);

describe('LockScreen', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <LockScreen />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
