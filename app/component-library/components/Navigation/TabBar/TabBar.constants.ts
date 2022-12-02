/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconNames } from '../../Icons/Icon';

// Internal dependencies.
import { IconByTabBarLabel, TabBarLabel } from './TabBar.types';

export const ICON_BY_TAB_BAR_LABEL: IconByTabBarLabel = {
  [TabBarLabel.Wallet]: IconNames.Wallet,
  [TabBarLabel.Browser]: IconNames.Explore,
};
