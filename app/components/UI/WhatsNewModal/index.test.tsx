import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsNewModal from './';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

describe('WhatsNewModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NavigationContainer independent>
        <Stack.Navigator>
          <Stack.Screen name="WhatsNewModal" component={WhatsNewModal} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
