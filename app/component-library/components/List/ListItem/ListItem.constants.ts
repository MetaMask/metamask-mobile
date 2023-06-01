/* eslint-disable import/prefer-default-export */

// Internal dependencies.
import { VerticalAlignment, ListItemProps } from './ListItem.types';

// Test IDs
export const TESTID_LISTITEM_GAP = 'listitem-gap';

// Defaults
export const DEFAULT_LISTITEM_PADDING = 16;
export const DEFAULT_LISTITEM_BORDERRADIUS = 0;
export const DEFAULT_LISTITEM_GAP = 16;
export const DEFAULT_LISTITEM_VERTICALALIGNMENT = VerticalAlignment.Top;

// Sample consts
export const SAMPLE_LISTITEM_PROPS: ListItemProps = {
  padding: DEFAULT_LISTITEM_PADDING,
  borderRadius: DEFAULT_LISTITEM_BORDERRADIUS,
  gap: DEFAULT_LISTITEM_GAP,
  verticalAlignment: DEFAULT_LISTITEM_VERTICALALIGNMENT,
};
