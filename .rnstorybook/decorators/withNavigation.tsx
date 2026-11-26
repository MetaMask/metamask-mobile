import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';

const StoryBookStack = createNativeStackNavigator();

const withNavigation = (Story: React.ComponentType) => {
  const StorybookScreen = () => <Story />;

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <StoryBookStack.Navigator>
          <StoryBookStack.Screen
            name="StorybookScreen"
            component={StorybookScreen}
            options={{ headerShown: false }}
          />
        </StoryBookStack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export default withNavigation;
