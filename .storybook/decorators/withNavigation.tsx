import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';

const StoryBookStack = createStackNavigator();

const withNavigation = (story: any) => {
  const StorybookScreen = () => story();
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
