import React from 'react';
import { render } from '@testing-library/react-native';
import WhatsNewModal from './';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeContext, mockTheme } from '../../../util/theme';

const Stack = createStackNavigator();

describe('WhatsNewModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="WhatsNewModal" component={WhatsNewModal} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
