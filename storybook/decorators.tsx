/* eslint-disable import/prefer-default-export */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

const StoryBookStack = createStackNavigator();

export const NavigationDecorator = (story: any) => {
  const StorybookScreen = () => story();
  return (
    <NavigationContainer independent>
      <StoryBookStack.Navigator>
        <StoryBookStack.Screen
          name="StorybookScreen"
          component={StorybookScreen}
          options={{ headerShown: false }}
        />
      </StoryBookStack.Navigator>
    </NavigationContainer>
  );
};
