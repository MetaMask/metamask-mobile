import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NavbarLeftButton from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('NavbarLeftButton', () => {
  it('should render correctly', () => {
    const address = '0xe7E125654064EEa56229f273dA586F10DF96B0a1';

    const { toJSON } = render(
      <Provider store={store}>
        <NavbarLeftButton address={address} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
