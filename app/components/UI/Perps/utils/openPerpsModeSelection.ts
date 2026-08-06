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

/**
 * Minimal navigation surface so callers can pass `AppNavigationProp`, root
 * `useNavigation()` results, or test doubles without fighting the
 * `getState(): State | undefined` override on MetaMask's navigation types.
 *
 * Method syntax (not a property) keeps `navigate` parameter-bivariant so
 * strongly typed navigators remain assignable under `strictFunctionTypes`.
 */
export interface OpenPerpsModeSelectionNavigation {
  navigate(name: string, params?: object): void;
}

export const openPerpsModeSelection = (
  navigation: OpenPerpsModeSelectionNavigation,
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
