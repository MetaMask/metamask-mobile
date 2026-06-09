///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { TextColor } from '@metamask/design-system-react-native';

export const SNAPS_SETTINGS_LIST_HEADER = 'snaps-settings-list-header';
export const SNAPS_SETTINGS_LIST_BACK_BUTTON =
  'snaps-settings-list-back-button';

/** Matches legacy `getNavigationOptionsTitle` primary header title color. */
export const SNAPS_HEADER_TITLE_PROPS = {
  color: TextColor.PrimaryDefault,
} as const;
///: END:ONLY_INCLUDE_IF
