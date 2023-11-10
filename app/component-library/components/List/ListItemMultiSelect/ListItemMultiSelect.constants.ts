/* eslint-disable import/prefer-default-export */
// External dependencies.
import { SAMPLE_LISTITEM_PROPS } from '../../List/ListItem/ListItem.constants';

// Internal dependencies.
import { ListItemMultiSelectProps } from './ListItemMultiSelect.types';

// Defaults
export const DEFAULT_LISTITEMMULTISELECT_GAP = 16;

// Sample consts
export const SAMPLE_LISTITEMMULTISELECT_PROPS: ListItemMultiSelectProps = {
  isSelected: true,
  isDisabled: false,
  ...SAMPLE_LISTITEM_PROPS,
};
