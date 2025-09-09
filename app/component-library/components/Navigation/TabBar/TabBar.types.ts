// Third party dependencies.
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type {
  Descriptor,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import {
  BottomTabNavigationProp,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs/lib/typescript/src/types';

// External dependencies.
import { IconName } from '../../Icons/Icon';

/**
 * Enum for supported tab bar labels.
 */
export enum TabBarIconKey {
  Wallet = 'Wallet',
  Browser = 'Browser',
  Actions = 'Actions',
  Activity = 'Activity',
  Setting = 'Setting',
  Rewards = 'Rewards',
}

/**
 * Mapping of icon name by tab bar label.
 */
export type IconByTabBarIconKey = {
  [key in TabBarIconKey]: IconName;
};

/**
 * TabBar component props.
 */
export interface CustomTabBarProps {
  state: BottomTabBarProps['state'];
  descriptors: {
    [key: string]: Descriptor<
      BottomTabNavigationOptions & {
        tabBarIconKey: TabBarIconKey;
        callback: () => void;
        rootScreenName: string;
      },
      BottomTabNavigationProp<ParamListBase>,
      RouteProp<ParamListBase>
    >;
  };
  navigation: BottomTabBarProps['navigation'];
  insets: BottomTabBarProps['insets'];
}

export type TabBarRoute = BottomTabBarProps['state']['routes'][number];
