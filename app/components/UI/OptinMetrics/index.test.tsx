import React from 'react';
import OptinMetrics from './';
import { render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  onboarding: {
    event: 'event',
  },
};
const store = mockStore(initialState);

describe('OptinMetrics', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <OptinMetrics />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
