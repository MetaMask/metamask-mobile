// Third party dependencies.
import {
  BottomTabBarOptions,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

// External dependencies.
import { IconName } from '../../Icon';

/**
 * Enum for supported tab bar labels.
 */
export enum TabBarIconKey {
  Wallet = 'Wallet',
  Browser = 'Browser',
}

/**
 * Mapping of icon name by tab bar label.
 */
export type IconByTabBarIconKey = {
  [key in TabBarIconKey]: IconName;
};

type TabBarOptions = BottomTabBarOptions & {
  descriptors: BottomTabBarProps['descriptors'];
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
