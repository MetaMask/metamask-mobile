import Routes from '../../../../constants/navigation/Routes';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import { hasCompletedPerpsModeSelection } from './perpsModeSelectionStorage';

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
 * `screen_type` for Lite/Pro chooser impressions (`PERPS_SCREEN_VIEWED`).
 * Not yet in `@metamask/perps-controller` `PERPS_EVENT_VALUE.SCREEN_TYPE`.
 */
export const PERPS_MODE_SELECTION_SCREEN_TYPE = 'mode_selection' as const;

/**
 * `interaction_type` for Lite/Pro chooser dismiss without selection.
 * Not yet in `@metamask/perps-controller` `PERPS_EVENT_VALUE.INTERACTION_TYPE`.
 */
export const PERPS_MODE_SELECTION_DISMISSED =
  'mode_selection_dismissed' as const;

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

/**
 * Opens the Lite/Pro chooser modal unconditionally (e.g. Trade menu first
 * entry, which already gates on {@link hasCompletedPerpsModeSelection}).
 */
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

/**
 * Opens the one-time Lite/Pro chooser when the user has not completed it yet
 * (shared with Trade → Perps). Returns whether the sheet was opened.
 *
 * Header toggles use this so the sheet appears at most once across Trade and
 * nav-bar entry points.
 */
export const openPerpsModeSelectionIfNeeded = async (
  navigation: OpenPerpsModeSelectionNavigation,
  params: PerpsModeSelectionRouteParams = {},
): Promise<boolean> => {
  if (await hasCompletedPerpsModeSelection()) {
    return false;
  }

  openPerpsModeSelection(navigation, params);
  return true;
};
