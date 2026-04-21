// Third party dependencies.
import { TouchableOpacityProps, StyleProp, ViewStyle } from 'react-native';

// External dependencies.
import { IconName } from '../../components/Icons/Icon';

/**
 * MainActionButton component props.
 */
export interface MainActionButtonProps extends TouchableOpacityProps {
  /**
   * Optional style applied to the outermost Animated.View container.
   * Use this to control layout (e.g. flex: 1) without adding a wrapper node.
   */
  containerStyle?: StyleProp<ViewStyle>;
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
