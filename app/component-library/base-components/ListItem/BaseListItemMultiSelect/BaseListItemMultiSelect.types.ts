// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { BaseListItemProps } from '../BaseListItem/BaseListItem.types';

/**
 * BaseListItemMultiSelect component props.
 */
export interface BaseListItemMultiSelectProps
  extends TouchableOpacityProps,
    Omit<BaseListItemProps, 'style'> {
  /**
   * Optional prop to determine if the item is selected.
   */
  isSelected?: boolean;
  /**
   * Optional prop to determine if the item is disabled.
   */
  isDisabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type BaseListItemMultiSelectStyleSheetVars = Pick<
  BaseListItemMultiSelectProps,
  'style' | 'isDisabled'
> & {
  gap: number | string | undefined;
};
