// External dependencies.
import { IconName } from '../../../component-library/components/Icons/Icon';
import { SAMPLE_LISTITEM_PROPS } from '../../../component-library/components/List/ListItem/ListItem.constants';

// Internal dependencies.
import { ListItemMultiSelectButtonProps } from './ListItemMultiSelectButton.types';

// Defaults
export const DEFAULT_LISTITEMMULTISELECT_GAP = 16;
export const BUTTON_TEST_ID = 'button-menu-select-test-id';
export const BUTTON_TEXT_TEST_ID = 'button-text-select-test-id';

// Sample consts
export const SAMPLE_LISTITEMMULTISELECT_PROPS: ListItemMultiSelectButtonProps =
  {
    isSelected: false,
    isDisabled: false,
    buttonIcon: IconName.Arrow2Right,
    ...SAMPLE_LISTITEM_PROPS,
  };
