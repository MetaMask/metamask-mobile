import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import TooltipModal from '../../app/components/Views/TooltipModal';
import Routes from '../../app/constants/navigation/Routes';
import { colors as importedColors } from '../../app/styles/common';

const StoryBookStack = createNativeStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
    cardStyleInterpolator: () => ({
      overlayStyle: {
        opacity: 0,
      },
    }),
  },
  animationEnabled: false,
  presentation: 'modal',
};

const StorybookRootModalFlow = () => (
  <StoryBookStack.Navigator screenOptions={clearStackNavigatorOptions}>
    <StoryBookStack.Screen
      name={Routes.SHEET.TOOLTIP_MODAL}
      component={TooltipModal}
    />
  </StoryBookStack.Navigator>
);

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withNavigation = (story: any) => {
  const StorybookScreen = () => story();
  return (
    <NavigationContainer independent>
      <StoryBookStack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: importedColors.transparent },
          animationEnabled: false,
          presentation: 'modal',
        }}
      >
        <StoryBookStack.Screen
          name="StorybookScreen"
          component={StorybookScreen}
          options={{ headerShown: false }}
        />
        <StoryBookStack.Screen
          name={Routes.MODAL.ROOT_MODAL_FLOW}
          component={StorybookRootModalFlow}
        />
      </StoryBookStack.Navigator>
    </NavigationContainer>
  );
};

export default withNavigation;
