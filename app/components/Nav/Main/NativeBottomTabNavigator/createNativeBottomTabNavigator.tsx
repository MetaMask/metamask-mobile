import {
  createNavigatorFactory,
  type DefaultNavigatorOptions,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  TabRouter,
  type TabRouterOptions,
  useNavigationBuilder,
} from '@react-navigation/native';
import React from 'react';
import type { BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';

import NativeBottomTabView from './NativeBottomTabView';
import type { NativeBottomTabNavigationOptions } from './types';

type Props = DefaultNavigatorOptions<
  ParamListBase,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationOptions,
  BottomTabNavigationEventMap
> &
  TabRouterOptions & {
    id?: string;
  };

function NativeBottomTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  screenListeners,
  screenOptions,
  ...rest
}: Props) {
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder<
      TabNavigationState<ParamListBase>,
      TabRouterOptions,
      TabActionHelpers<ParamListBase>,
      NativeBottomTabNavigationOptions,
      BottomTabNavigationEventMap
    >(TabRouter, {
      id,
      initialRouteName,
      backBehavior,
      children,
      screenListeners,
      screenOptions,
    });

  return (
    <NavigationContent>
      <NativeBottomTabView
        {...rest}
        state={state}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridge RN6 helpers to native view
        navigation={navigation as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- descriptor map shape matches view props
        descriptors={descriptors as any}
      />
    </NavigationContent>
  );
}

export const createNativeBottomTabNavigator = createNavigatorFactory<
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationOptions,
  BottomTabNavigationEventMap,
  typeof NativeBottomTabNavigator
>(NativeBottomTabNavigator);
