import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionsView from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});
describe('TransactionsView', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <TransactionsView />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
