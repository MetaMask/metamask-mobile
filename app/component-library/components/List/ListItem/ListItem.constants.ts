/* eslint-disable import/prefer-default-export */

// Internal dependencies.
import { VerticalAlignment, ListItemProps } from './ListItem.types';

// Test IDs
export const TESTID_LISTITEM = 'listitem';
export const TESTID_LISTITEM_GAP = 'listitem-gap';

// Defaults
export const DEFAULT_LISTITEM_VERTICALALIGNMENT = VerticalAlignment.Top;
export const DEFAULT_LISTITEM_GAP = 16;

// Sample consts
export const SAMPLE_LISTITEM_PROPS: ListItemProps = {
  gap: DEFAULT_LISTITEM_GAP,
  verticalAlignment: DEFAULT_LISTITEM_VERTICALALIGNMENT,
};
