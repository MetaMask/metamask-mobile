import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';

/**
 * Where the Lite/Pro chooser was opened from. Drives post-selection navigation.
 *
 * - `trade`: first-entry chooser from the Trade menu
 * - `home`: Perps home header toggle
 * - `market`: Lite/Pro market header pill
 */
export type PerpsModeSelectionEntry = 'trade' | 'home' | 'market';

export interface PerpsModeSelectionRouteParams {
  entry?: PerpsModeSelectionEntry;
  source?: string;
}

export const openPerpsModeSelection = (
  navigation: NavigationProp<ParamListBase>,
  params: PerpsModeSelectionRouteParams = {},
): void => {
  navigation.navigate(Routes.PERPS.MODALS.ROOT, {
    screen: Routes.PERPS.MODALS.MODE_SELECTION,
    params: {
      entry: params.entry ?? 'trade',
      source: params.source ?? PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
    },
  });
};
