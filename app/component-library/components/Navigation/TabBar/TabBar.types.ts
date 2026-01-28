// Third party dependencies.
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  BottomTabDescriptor,
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
  Trade = 'Trade',
  Activity = 'Activity',
  Setting = 'Setting',
  Rewards = 'Rewards',
  Trending = 'Trending',
}

/**
 * Mapping of icon name by tab bar label.
 */
export type IconByTabBarIconKey = {
  [key in TabBarIconKey]: IconName;
};

export interface ExtendedBottomTabDescriptor extends BottomTabDescriptor {
  options: BottomTabNavigationOptions & {
    tabBarIconKey: TabBarIconKey;
    callback: () => void;
    rootScreenName: string;
    isSelected?: (rootScreenName: string) => boolean;
    isHidden?: boolean;
  };
}

/**
 * TabBar component props.
 * In React Navigation v6, BottomTabBarProps is not generic.
 * We extend it with our custom descriptors type.
 */
export type TabBarProps = BottomTabBarProps & {
  descriptors: {
    [key: string]: ExtendedBottomTabDescriptor;
  };
};
