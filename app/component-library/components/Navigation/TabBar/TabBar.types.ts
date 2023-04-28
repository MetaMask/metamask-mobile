// Third party dependencies.
import {
  BottomTabBarOptions,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
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
  Activity = 'Activity',
  Setting = 'Setting',
}

/**
 * Mapping of icon name by tab bar label.
 */
export type IconByTabBarIconKey = {
  [key in TabBarIconKey]: IconName;
};

interface ExtendedBottomTabDescriptor extends BottomTabDescriptor {
  options: BottomTabNavigationOptions & {
    tabBarIconKey: TabBarIconKey;
    callback: () => void;
    rootScreenName: string;
  };
}

type TabBarOptions = BottomTabBarOptions & {
  descriptors: {
    [key: string]: ExtendedBottomTabDescriptor;
  };
};

/**
 * TabBar component props.
 */
export type TabBarProps = BottomTabBarProps<TabBarOptions>;

/**
 * Style sheet input parameters.
 */
export interface TabBarStyleSheetVars {
  bottomInset: number;
}
