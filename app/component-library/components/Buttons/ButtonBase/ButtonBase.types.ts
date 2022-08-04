import { TouchableOpacityProps } from 'react-native';

import { IconProps } from '../../Icon';

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
   * Button icon.
   */
  icon?: IconProps['name'];
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
