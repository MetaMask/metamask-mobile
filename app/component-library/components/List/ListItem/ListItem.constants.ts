/* eslint-disable import/prefer-default-export */

// Internal dependencies.
import { VerticalAlignment, ListItemProps } from './ListItem.types';

// Test IDs
export const TESTID_LISTITEM_GAP = 'listitem-gap';

// Defaults
export const DEFAULT_LISTITEM_GAP = 16;
export const DEFAULT_LISTITEM_VERTICALALIGNMENT = VerticalAlignment.Center;
export const DEFAULT_LISTITEM_TOPACCESSORYGAP = 0;
export const DEFAULT_LISTITEM_BOTTOMACCESSORYGAP = 0;

// Sample consts
export const SAMPLE_LISTITEM_PROPS: ListItemProps = {
  gap: DEFAULT_LISTITEM_GAP,
  verticalAlignment: DEFAULT_LISTITEM_VERTICALALIGNMENT,
  topAccessoryGap: DEFAULT_LISTITEM_TOPACCESSORYGAP,
  bottomAccessoryGap: DEFAULT_LISTITEM_BOTTOMACCESSORYGAP,
};
