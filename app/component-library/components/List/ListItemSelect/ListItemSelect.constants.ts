/* eslint-disable import/prefer-default-export */
// External dependencies.
import { SAMPLE_LISTITEM_PROPS } from '../ListItem/ListItem.constants';

// Internal dependencies.
import { ListItemSelectProps } from './ListItemSelect.types';

// Defaults
export const DEFAULT_SELECTITEM_GAP = 16;

// Test IDs
export const SELECTABLE_ITEM_UNDERLAY_ID = 'selectable-item-underlay';

// Sample consts
export const SAMPLE_SELECTITEM_PROPS: ListItemSelectProps = {
  isSelected: true,
  isDisabled: false,
  ...SAMPLE_LISTITEM_PROPS,
};
