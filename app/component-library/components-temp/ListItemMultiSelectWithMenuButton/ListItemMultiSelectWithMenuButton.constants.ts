// External dependencies.
import { IconName } from '../../../component-library/components/Icons/Icon';
import { SAMPLE_LISTITEM_PROPS } from '../../../component-library/components/List/ListItem/ListItem.constants';

// Internal dependencies.
import { ListItemMultiSelectWithMenuButtonProps } from './ListItemMultiSelectWithMenuButton.types';

// Defaults
export const DEFAULT_LIST_ITEM_MULTISELECT_WITH_MENU_BUTTON_GAP = 16;
export const BUTTON_TEST_ID = 'button-menu-select-with-menu-button-test-id';
export const BUTTON_TEXT_TEST_ID =
  'button-text-select-with-menu-button-test-id';

// Sample consts
export const SAMPLE_LIST_ITEM_MULTISELECT_WITH_MENU_BUTTON_PROPS: ListItemMultiSelectWithMenuButtonProps =
  {
    isSelected: false,
    isDisabled: false,
    buttonIcon: IconName.Arrow2Right,
    ...SAMPLE_LISTITEM_PROPS,
  };
