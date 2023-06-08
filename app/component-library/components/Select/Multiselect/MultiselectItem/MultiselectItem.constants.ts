/* eslint-disable import/prefer-default-export */
// External dependencies.
import { SAMPLE_LISTITEM_PROPS } from '../../../List/ListItem/ListItem.constants';

// Internal dependencies.
import { MultiSelectItemProps } from './MultiSelectItem.types';

// Defaults
export const DEFAULT_MULTISELECTITEM_PADDING = 16;
export const DEFAULT_MULTISELECTITEM_BORDERRADIUS = 4;
export const DEFAULT_MULTISELECTITEM_GAP = 16;

// Sample consts
export const SAMPLE_MULTISELECTITEM_PROPS: MultiSelectItemProps = {
  isSelected: true,
  isDisabled: false,
  ...SAMPLE_LISTITEM_PROPS,
};
