import React from 'react';
import { render } from '@testing-library/react-native';
import Login from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  user: {
    passwordSet: true,
  },
};
const store = mockStore(initialState);

describe('Login', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Login />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
