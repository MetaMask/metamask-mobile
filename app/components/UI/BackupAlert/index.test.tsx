/* eslint-disable react/jsx-no-bind */
import React from 'react';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import BackupAlert from './';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  user: {
    seedphraseBackedUp: false,
    passwordSet: false,
  },
  wizard: {
    step: 0,
  },
};
const store = mockStore(initialState);

describe('BackupAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <BackupAlert />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
