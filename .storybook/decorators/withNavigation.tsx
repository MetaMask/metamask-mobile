import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

const StoryBookStack = createNativeStackNavigator();

const withNavigation = (story: any) => {
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

export default withNavigation;
