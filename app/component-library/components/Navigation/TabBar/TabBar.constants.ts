/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies.
import { IconByTabBarLabel, TabBarLabel } from './TabBar.types';

export const ICON_BY_TAB_BAR_LABEL: IconByTabBarLabel = {
  [TabBarLabel.Wallet]: IconName.Wallet,
  [TabBarLabel.Browser]: IconName.Explore,
};
