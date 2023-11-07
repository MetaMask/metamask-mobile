/* eslint-disable import/prefer-default-export */
// External dependencies.
import { SAMPLE_LISTITEM_PROPS } from '../../../List/ListItem/ListItem.constants';

// Internal dependencies.
import { SelectItemProps } from './SelectItem.types';

// Defaults
export const DEFAULT_SELECTITEM_PADDING = 16;
export const DEFAULT_SELECTITEM_BORDERRADIUS = 4;

// Test IDs
export const SELECTABLE_ITEM_UNDERLAY_ID = 'selectable-item-underlay';

// Sample consts
export const SAMPLE_SELECTITEM_PROPS: SelectItemProps = {
  isSelected: true,
  isDisabled: false,
  ...SAMPLE_LISTITEM_PROPS,
};
