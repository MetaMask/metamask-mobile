// External dependencies.
import { HeaderBaseProps } from '../../HeaderBase/HeaderBase.types';

/**
 * BottomSheetHeader component props.
 */
export interface BottomSheetHeaderProps extends HeaderBaseProps {
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
