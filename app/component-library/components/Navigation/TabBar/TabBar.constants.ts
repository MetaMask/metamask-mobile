/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconName } from '../../Icons/Icon';
// Internal dependencies.
import { IconByTabBarIconKey, TabBarIconKey } from './TabBar.types';

export const ICON_BY_TAB_BAR_ICON_KEY: IconByTabBarIconKey = {
  [TabBarIconKey.Wallet]: IconName.Home,
  [TabBarIconKey.Browser]: IconName.Explore,
  [TabBarIconKey.Actions]: IconName.SwapVertical,
  [TabBarIconKey.Activity]: IconName.Activity,
  [TabBarIconKey.Setting]: IconName.Setting,
  [TabBarIconKey.Rewards]: IconName.Star,
};

export const LABEL_BY_TAB_BAR_ICON_KEY = {
  [TabBarIconKey.Wallet]: 'bottom_nav.home',
  [TabBarIconKey.Browser]: 'bottom_nav.browser',
  [TabBarIconKey.Actions]: '',
  [TabBarIconKey.Activity]: 'bottom_nav.activity',
  [TabBarIconKey.Setting]: 'bottom_nav.settings',
  [TabBarIconKey.Rewards]: 'bottom_nav.rewards',
} as const;

export const TAB_BAR_HEIGHT = 54; // 22px text line height + 20px icon height + 12px padding top
