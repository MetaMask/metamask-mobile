import React, { useRef } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  ParamListBase,
  Theme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  onNavigationReady,
  setCurrentRoute,
} from '../../../actions/navigation';
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

const Stack = createStackNavigator();

/**
 * Provides the navigation context to the app
 */
const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const hasInitialized = useRef(false);

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
   * Dispatches the currently-focused leaf route name into redux so sagas
   * (notably the deeplink pipeline) can observe navigation transitions via
   * `take(SET_CURRENT_ROUTE)` instead of polling the navigation ref.
   */
  const dispatchCurrentRoute = () => {
    const routeName =
      NavigationService.navigation?.getCurrentRoute?.()?.name;
    if (routeName) {
      dispatch(setCurrentRoute(routeName));
    }
  };

  /**
   * Triggers when the navigation is ready. React Navigation does NOT fire
   * `onStateChange` on initial mount, so we seed the redux current route
   * here — otherwise the deeplink saga would read the `undefined` initial
   * state and race against the first real navigation.
   */
  const onReady = () => {
    endTrace({ name: TraceName.NavInit });
    dispatch(onNavigationReady());
    dispatchCurrentRoute();
  };

  /**
   * Sets the navigation ref on the NavigationService
   */
  const setNavigationRef = (ref: NavigationContainerRef<ParamListBase>) => {
    // This condition only happens on unmount. But that should never happen since this is meant to always be mounted.
    if (!ref) {
      return;
    }
    NavigationService.navigation = ref;
  };

  return (
    <NavigationContainer
      // Using transparent background to support transparent modals
      // The actual app background is handled by individual screens
      theme={{ colors: { background: 'transparent' } } as Theme}
      onReady={onReady}
      onStateChange={dispatchCurrentRoute}
      ref={setNavigationRef}
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
