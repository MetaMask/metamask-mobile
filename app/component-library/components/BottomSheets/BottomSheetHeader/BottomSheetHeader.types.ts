// External dependencies.
import { HeaderProps } from '../../Header/Header.types';

/**
 * BottomSheetHeader component props.
 */
export interface BottomSheetHeaderProps extends HeaderProps {
  /**
   * Optional function to trigger when pressing the back button.
   */
  onBack?: () => void;
  /**
   * Optional function to trigger when pressing the close button.
   */
  onClose?: () => void;
}

/**
 * Style sheet input parameters.
 */
export type BottomSheetHeaderStyleSheetVars = Pick<
  BottomSheetHeaderProps,
  'style'
>;
