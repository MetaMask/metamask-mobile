import React, { useState } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  ParamListBase,
  Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { clearNativeStackNavigatorOptions } from '../../../constants/navigation/clearStackNavigatorOptions';
import { NavigationProviderProps } from './types';

const NativeStack = createNativeStackNavigator();

/**
 * Provides the navigation context to the app
 */
const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const dispatch = useDispatch();

  // Start the navigation-init trace exactly once, on first render. A lazy
  // useState initializer runs a single time and—unlike reading/writing a ref
  // during render—is compatible with the React Compiler, while preserving the
  // original "start during the first render" timing.
  useState(() => {
    trace({
      name: TraceName.NavInit,
      parentContext: getUIStartupSpan(),
      op: TraceOperation.NavInit,
    });
    return true;
  });

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
      ref={setNavigationRef}
    >
      <NativeStack.Navigator
        initialRouteName="NavigationChildren"
        screenOptions={clearNativeStackNavigatorOptions}
      >
        <NativeStack.Screen name="NavigationChildren">
          {() => <>{children}</>}
        </NativeStack.Screen>
      </NativeStack.Navigator>
    </NavigationContainer>
  );
};

export default NavigationProvider;
