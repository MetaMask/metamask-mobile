/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconName } from '../../Icons/Icon';
import Device from '../../../../util/device';
// Internal dependencies.
import { IconByTabBarIconKey, TabBarIconKey } from './TabBar.types';

export const ICON_BY_TAB_BAR_ICON_KEY: IconByTabBarIconKey = {
  [TabBarIconKey.Wallet]: IconName.Wallet,
  [TabBarIconKey.Browser]: IconName.Explore,
  [TabBarIconKey.Actions]: IconName.SwapVertical,
  [TabBarIconKey.Activity]: IconName.Activity,
  [TabBarIconKey.Setting]: IconName.Setting,
};

export const TAB_BAR_HEIGHT = Device.isAndroid() ? 62 : 48;
