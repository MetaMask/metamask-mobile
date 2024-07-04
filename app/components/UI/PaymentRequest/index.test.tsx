import React from 'react';
import { render } from '@testing-library/react-native';
import PaymentRequest from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});
describe('PaymentRequest', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <PaymentRequest />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
