// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconName } from '../../../component-library/components/Icons/Icon';
import { ListItemProps } from '../../../component-library/components/List/ListItem/ListItem.types';
import { GestureResponderEvent } from 'react-native-modal';

/**
 * ListItemMultiSelect component props.
 */
export interface ListItemMultiSelectWithMenuButtonProps
  extends TouchableOpacityProps,
    Omit<ListItemProps, 'style' | 'hitSlop'> {
  /**
   * Optional prop to determine if the item is selected.
   */
  isSelected?: boolean;
  /**
   * Optional prop to determine if the item is disabled.
   */
  isDisabled?: boolean;

  /**
   * Optional Button icon type.
   */
  buttonIcon?: IconName;

  /**
   * Optional button onClick rpc modal function
   */
  onTextClick?: (() => void) | undefined;

  /**
   * Optional property to add avatar
   */
  withAvatar?: boolean;

  /**
   * Optional property to show icon
   */
  showButtonIcon?: boolean;

  /**
   * Optional button props
   */
  buttonProps?: {
    /**
     * Optional button onClick function
     */
    onButtonClick?: ((event: GestureResponderEvent) => void) | undefined;
    /**
     * Optional property to show text button
     */
    textButton?: string | null;

    /**
     * Optional property to show button icon
     */
    showButtonIcon?: boolean;

    /**
     * Optional property for button test ID
     */
    buttonTestId?: string;
  };
}

/**
 * Style sheet input parameters.
 */
export type ListItemMultiSelectWithMenuButtonStyleSheetVars = Pick<
  ListItemMultiSelectWithMenuButtonProps,
  'style' | 'isDisabled' | 'isSelected'
> & {
  gap: number | string | undefined;
};
