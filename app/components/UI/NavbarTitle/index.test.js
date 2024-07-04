import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NavbarTitle from './';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const mockStore = configureMockStore();
const store = mockStore({});

const Stack = createStackNavigator();

describe('NavbarTitle', () => {
  it('should render correctly', () => {
    const title = 'Test';
    const { toJSON } = render(
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="NavbarTitle">
              {() => <NavbarTitle title={title} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
