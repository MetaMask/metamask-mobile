import React, { useRef, useCallback } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationState,
  Theme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../../util/theme';
import { onNavigationReady } from '../../../actions/navigation';
import { useDispatch } from 'react-redux';
import NavigationService from '../../../core/NavigationService';
import {
  trace,
  endTrace,
  TraceOperation,
  TraceName,
} from '../../../util/trace';
import getUIStartupSpan from '../../../core/Performance/UIStartup';
import { NavigationProviderProps } from './types';
import { usePerpsNavigationMonitoring } from '../../UI/Perps/hooks/usePerpsNavigationMonitoring';

const Stack = createStackNavigator();

/**
 * Provides the navigation context to the app
 */
const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const hasInitialized = useRef(false);
  const { handleRouteChange } = usePerpsNavigationMonitoring();

  /**
   * Gets the current route name from navigation state (memoized)
   */
  const getCurrentRouteName = useCallback((navState?: NavigationState): string | undefined => {
    if (!navState) return undefined;
    const route = navState.routes[navState.index];
    return route.state ? getCurrentRouteName(route.state as NavigationState) : route.name;
  }, []);

  /**
   * Handles navigation state changes for Perps monitoring (memoized)
   */
  const onNavigationStateChange = useCallback((state?: NavigationState) => {
    const currentRoute = getCurrentRouteName(state);
    handleRouteChange(currentRoute);
  }, [getCurrentRouteName, handleRouteChange]);

  // Start trace when navigation provider is initialized
  if (!hasInitialized.current) {
    trace({
      name: TraceName.NavInit,
      parentContext: getUIStartupSpan(),
      op: TraceOperation.NavInit,
    });
    hasInitialized.current = true;
  }

  /**
   * Triggers when the navigation is ready
   */
  const onReady = () => {
    // End trace when navigation is ready
    endTrace({ name: TraceName.NavInit });
    // Dispatch navigation ready action, used by sagas
    dispatch(onNavigationReady());
  };

  /**
   * Sets the navigation ref on the NavigationService
   */
  const setNavigationRef = (ref: NavigationContainerRef) => {
    // This condition only happens on unmount. But that should never happen since this is meant to always be mounted.
    if (!ref) {
      return;
    }
    NavigationService.navigation = ref;
  };

  return (
    <NavigationContainer
      // TODO: Check if other color properties are needed
      theme={{ colors: { background: colors.background.default } } as Theme}
      onReady={onReady}
      ref={setNavigationRef}
      onStateChange={onNavigationStateChange}
    >
      <Stack.Navigator
        initialRouteName="NavigationProvider"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="NavigationChildren">
          {() => <>{children}</>}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default NavigationProvider;
