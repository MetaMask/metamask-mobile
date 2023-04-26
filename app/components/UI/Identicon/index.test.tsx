import React from 'react';
import { render } from '@testing-library/react-native';
import Identicon from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

describe('Identicon', () => {
  const mockStore = configureMockStore();
  it('should render correctly when useBlockieIcon is true', () => {
    const initialState = {
      settings: { useBlockieIcon: true },
    };
    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render correctly when useBlockieIcon is false', () => {
    const initialState = {
      settings: { useBlockieIcon: false },
    };
    const store = mockStore(initialState);

    const { toJSON } = render(
      <Provider store={store}>
        <Identicon />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
