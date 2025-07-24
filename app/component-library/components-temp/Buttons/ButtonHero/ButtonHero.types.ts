// Third party dependencies.
import { PressableProps } from 'react-native';

// External dependencies.
import { IconProps } from '../../../components/Icons/Icon';

/**
 * ButtonHero component props.
 */
export interface ButtonHeroProps extends PressableProps {
  /**
   * Button text.
   */
  label: string | React.ReactNode;
  /**
   * Optional prop for the icon name of the icon that will be displayed before the label.
   */
  startIconName?: IconProps['name'];
  /**
   * Optional prop for the icon name of the icon that will be displayed after the label.
   */
  endIconName?: IconProps['name'];
  /**
   * Function to trigger when pressing the button.
   */
  onPress: () => void;
  /**
   * Optional param to disable the button.
   */
  isDisabled?: boolean;
  /**
   * An optional loading state of Button.
   */
  loading?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type ButtonHeroStyleSheetVars = Pick<ButtonHeroProps, 'style'> & {
  pressed: boolean;
};
