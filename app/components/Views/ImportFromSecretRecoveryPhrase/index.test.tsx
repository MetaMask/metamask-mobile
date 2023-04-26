import React from 'react';
import { render } from '@testing-library/react-native';
import ImportFromSecretRecoveryPhrase from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
};
const store = mockStore(initialState);

describe('ImportFromSecretRecoveryPhrase', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ImportFromSecretRecoveryPhrase />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
