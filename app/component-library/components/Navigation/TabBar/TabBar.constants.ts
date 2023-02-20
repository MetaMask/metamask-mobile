/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies.
import { IconByTabBarIconKey, TabBarIconKey } from './TabBar.types';

export const ICON_BY_TAB_BAR_LABEL: IconByTabBarLabel = {
  [TabBarLabel.Wallet]: IconName.Wallet,
  [TabBarLabel.Browser]: IconName.Explore,
};
