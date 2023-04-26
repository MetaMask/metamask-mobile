import React from 'react';
import { render } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import OfflineMode from './';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  infuraAvailability: {
    isBlocked: false,
  },
};
const store = mockStore(initialState);

describe('OfflineMode', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <OfflineMode />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
