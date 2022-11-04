// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// External dependencies.
import { IconProps } from '../../../../Icon';
import { ButtonSize, ButtonVariants } from '../../Button.types';

/**
 * ButtonBase component props.
 */
export interface ButtonBaseProps extends TouchableOpacityProps {
  /**
   * Button text.
   */
  label: string;
  /**
   * Variant of Button
   */
  variant?: ButtonVariants;
  /**
   * Color of label. Applies to icon too.
   */
  labelColor?: string;
  /**
   * Icon name of the icon that will be displayed.
   */
  iconName?: IconProps['name'];
  /**
   * Size of the button.
   */
  size?: ButtonSize;
  /**
   * Function to trigger when pressing the button.
   */
  onPress: () => void;
}
/**
 * Style sheet input parameters.
 */
export type ButtonBaseStyleSheetVars = Pick<
  ButtonBaseProps,
  'style' | 'size' | 'labelColor'
>;
