// Third party dependencies.
import { TouchableOpacityProps } from 'react-native';

// Third party dependencies.
import { IconProps } from '../../Icon';

/**
 * Size variants of ButtonBase.
 */
export enum ButtonBaseSize {
  Sm = '32',
  Md = '40',
  Lg = '48',
}

/**
 * ButtonBase component props.
 */
export interface ButtonBaseProps extends TouchableOpacityProps {
  /**
   * Button text.
   */
  label: string;
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
  size?: ButtonBaseSize;
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
