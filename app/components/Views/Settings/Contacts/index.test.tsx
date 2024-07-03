import React from 'react';
import { render } from '@testing-library/react-native';
import Contacts from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('Contacts', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Contacts />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
