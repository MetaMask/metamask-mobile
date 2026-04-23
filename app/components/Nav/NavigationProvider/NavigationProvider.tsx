import React, { useRef } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  NavigationState,
  ParamListBase,
  PartialState,
  Route,
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
   * Triggers when the navigation is ready
   */
  const onReady = () => {
    // End trace when navigation is ready
    endTrace({ name: TraceName.NavInit });
    // Dispatch navigation ready action, used by sagas
    dispatch(onNavigationReady());
  };

  /**
   * Walk a (possibly nested) navigation state to find the name of the
   * currently-focused leaf route.
   */
  const getFocusedRouteName = (
    state: NavigationState | PartialState<NavigationState> | undefined,
  ): string | undefined => {
    if (!state || state.index === undefined) return undefined;
    const route = state.routes[state.index] as
      | (Route<string> & { state?: PartialState<NavigationState> })
      | undefined;
    if (!route) return undefined;
    if (route.state) {
      const nested = getFocusedRouteName(route.state);
      if (nested) return nested;
    }
    return route.name;
  };

  /**
   * Triggers on every navigation state change. Dispatches `setCurrentRoute`
   * so sagas (e.g. the deeplink pipeline) can use `take(SET_CURRENT_ROUTE)`
   * to react to navigation transitions as proper redux events rather than
   * polling `NavigationContainerRef.getCurrentRoute()`.
   */
  const onStateChange = (state: NavigationState | undefined) => {
    const routeName = getFocusedRouteName(state);
    if (routeName) {
      dispatch(setCurrentRoute(routeName));
    }
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
      onStateChange={onStateChange}
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
