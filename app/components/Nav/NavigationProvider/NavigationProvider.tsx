import {
  NavigationContainer,
  NavigationContainerRef,
  Theme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../../util/theme';
import { onNavigationReady } from '../../../actions/navigation';
import { useDispatch } from 'react-redux';
import NavigationService from '../../../core/NavigationService';
import { NavigationProviderProps } from './types';
import React from 'react';

const Stack = createStackNavigator();

/**
 * Provides the navigation context to the app
 */
const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();

  /**
   * Triggers when the navigation is ready
   */
  const onReady = () => dispatch(onNavigationReady());

  /**
   * Sets the navigation ref on the NavigationService
   */
  const setNavigationRef = (ref: NavigationContainerRef) => {
    NavigationService.navigation = ref;
  };

  const NavigationChildren: React.FC = () => <>{children}</>;

  return (
    <NavigationContainer
      // TODO: Check if other color properties are needed
      theme={{ colors: { background: colors.background.default } } as Theme}
      onReady={onReady}
      ref={setNavigationRef}
    >
      <Stack.Navigator
        initialRouteName="NavigationProvider"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="NavigationChildren"
          component={NavigationChildren}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default NavigationProvider;
