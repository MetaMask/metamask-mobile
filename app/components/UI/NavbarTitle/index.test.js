import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NavbarTitle from './';
import { NavigationContainer } from '@react-navigation/native';

const mockStore = configureMockStore();
const store = mockStore({});

describe('NavbarTitle', () => {
  it('should render correctly', () => {
    const title = 'Test';
    const { toJSON } = render(
      <Provider store={store}>
        <NavigationContainer>
          <NavbarTitle title={title} />
        </NavigationContainer>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
