import { IconName } from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import type { FixedTabDefinition } from './fixedTabNav.types';

/** Footer order is fixed: Home · Money · Trade · Collect · Social. */
export const FIXED_TABS: readonly FixedTabDefinition[] = [
  {
    key: 'home',
    label: 'Home',
    routeName: Routes.WALLET.HOME,
    icon: IconName.Home,
    selectedIcon: IconName.HomeFilled,
  },
  {
    key: 'money',
    label: 'Money',
    routeName: Routes.FIXED_TAB_NAV.MONEY,
    icon: IconName.Musd,
    selectedIcon: IconName.MusdFilled,
  },
  {
    key: 'trade',
    label: 'Trade',
    routeName: Routes.FIXED_TAB_NAV.TRADE,
    icon: IconName.Chart,
    selectedIcon: IconName.Chart,
  },
  {
    key: 'collect',
    label: 'Collect',
    routeName: Routes.FIXED_TAB_NAV.COLLECT,
    // No dedicated Collect glyph. Image is the collectibles stand-in.
    icon: IconName.Image,
    selectedIcon: IconName.Image,
  },
  {
    key: 'social',
    label: 'Social',
    routeName: Routes.SOCIAL.TAB,
    icon: IconName.People,
    selectedIcon: IconName.PeopleFilled,
  },
];
