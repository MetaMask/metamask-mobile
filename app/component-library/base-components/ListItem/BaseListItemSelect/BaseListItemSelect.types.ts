// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { BaseListItemProps } from '../BaseListItem/BaseListItem.types';

/**
 * BaseListItemSelect component props.
 */
export interface BaseListItemSelectProps
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
export type BaseListItemSelectStyleSheetVars = Pick<
  BaseListItemSelectProps,
  'style' | 'isDisabled'
>;
