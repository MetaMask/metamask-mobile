/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { IconName } from '../../Icon';

// Internal dependencies.
import { IconByTabBarIconKey, TabBarIconKey } from './TabBar.types';

export const ICON_BY_TAB_BAR_LABEL: IconByTabBarIconKey = {
  [TabBarIconKey.Wallet]: IconName.WalletFilled,
  [TabBarIconKey.Browser]: IconName.ExploreFilled,
};
