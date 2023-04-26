import React from 'react';
import { render } from '@testing-library/react-native';
import AddressElement from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
      },
    },
  },
};
const store = mockStore(initialState);

describe('AddressElement', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AddressElement />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
