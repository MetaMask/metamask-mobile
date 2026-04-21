// Third party dependencies.
import { PressableProps, StyleProp, ViewStyle } from 'react-native';

// External dependencies.
import { IconName } from '../../components/Icons/Icon';

/**
 * MainActionButton component props.
 */
export interface MainActionButtonProps extends PressableProps {
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName: IconName;
  /**
   * Label text that will be displayed below the icon.
   */
  label: string;
  /**
   * Optional param to disable the button.
   */
  isDisabled?: boolean;
  /**
   * Optional style applied to the outer Animated.View container.
   * Use this instead of a wrapper View to avoid extra DOM nodes.
   */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Style sheet input parameters.
 */
export type MainActionButtonStyleSheetVars = Pick<
  MainActionButtonProps,
  'style'
> & {
  isDisabled: boolean;
};
