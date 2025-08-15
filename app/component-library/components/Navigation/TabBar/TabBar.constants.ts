/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconName } from '../../Icons/Icon';
// External dependencies.
import { strings } from '../../../../../locales/i18n';
// Internal dependencies.
import { IconByTabBarIconKey, TabBarIconKey } from './TabBar.types';

export const ICON_BY_TAB_BAR_ICON_KEY: IconByTabBarIconKey = {
  [TabBarIconKey.Wallet]: IconName.Home,
  [TabBarIconKey.Browser]: IconName.Explore,
  [TabBarIconKey.Actions]: IconName.SwapVertical,
  [TabBarIconKey.Activity]: IconName.Activity,
  [TabBarIconKey.Setting]: IconName.Setting,
};

export const LABEL_BY_TAB_BAR_ICON_KEY = {
  [TabBarIconKey.Wallet]: strings('bottom_nav.home'),
  [TabBarIconKey.Browser]: strings('bottom_nav.browser'),
  [TabBarIconKey.Actions]: '',
  [TabBarIconKey.Activity]: strings('bottom_nav.activity'),
  [TabBarIconKey.Setting]: strings('bottom_nav.settings'),
} as const;

export const TAB_BAR_HEIGHT = 54; // 22px text line height + 20px icon height + 12px padding top
