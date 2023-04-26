import React from 'react';
import { render } from '@testing-library/react-native';
import Send from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Accounts', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <Send />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
