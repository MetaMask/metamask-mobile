// Third party dependencies.
import { ViewProps } from 'react-native';

// External Dependencies.
import { ButtonProps } from '../../Buttons/Button/Button.types';

/**
 * Buttons Alignment options.
 */
export enum ButtonsAlignment {
  Horizontal = 'Horizontal',
  Vertical = 'Vertical',
}

/**
 * BottomSheetFooter component props.
 */
export interface BottomSheetFooterProps extends ViewProps {
  /**
   * Optional prop to control the alignment of the buttons.
   * @default ButtonsAlignment.Horizontal
   */
  buttonsAlignment?: ButtonsAlignment;
  /**
   * Array of buttons that will be displayed in the footer
   */
  buttonPropsArray: ButtonProps[];
  /**
   * Optional prop to control the background color of the footer.
   * @default false
   */
  isBackgroundAlternative?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type BottomSheetFooterStyleSheetVars = Pick<
  BottomSheetFooterProps,
  'style' | 'buttonsAlignment' | 'isBackgroundAlternative'
>;
