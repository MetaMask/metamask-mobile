import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  networkOnboarded: {
    networkOnboardedState: { '1': true },
  },
};
const store = mockStore(initialState);

describe('NetworkSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <NetworkSettings />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
