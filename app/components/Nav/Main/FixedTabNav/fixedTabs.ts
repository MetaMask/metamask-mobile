import { IconName } from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import type { FixedTabDefinition } from './fixedTabNav.types';

/**
 * Footer order is fixed: Home · Trade · Money · Collect.
 * Search is not a tab in this prototype.
 */
export const FIXED_TABS: readonly FixedTabDefinition[] = [
  {
    key: 'home',
    label: 'Home',
    routeName: Routes.WALLET.HOME,
    icon: IconName.Home,
    selectedIcon: IconName.HomeFilled,
  },
  {
    key: 'trade',
    label: 'Trade',
    routeName: Routes.FIXED_TAB_NAV.TRADE,
    // Trade used Chart on the earlier Trade experiment.
    icon: IconName.Chart,
    selectedIcon: IconName.Chart,
  },
  {
    key: 'money',
    label: 'Money',
    routeName: Routes.FIXED_TAB_NAV.MONEY,
    icon: IconName.Musd,
    selectedIcon: IconName.MusdFilled,
  },
  {
    key: 'collect',
    label: 'Collect',
    routeName: Routes.FIXED_TAB_NAV.COLLECT,
    // No dedicated Collect glyph. Image is the collectibles stand-in.
    icon: IconName.Image,
    selectedIcon: IconName.Image,
  },
];
