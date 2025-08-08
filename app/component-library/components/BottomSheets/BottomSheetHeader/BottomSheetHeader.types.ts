// External dependencies.
import { HeaderBaseProps } from '../../HeaderBase/HeaderBase.types';

/**
 * Alignment options for BottomSheetHeader title.
 */
export enum BottomSheetHeaderAlignment {
  Center = 'center',
  Left = 'left',
}

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
  /**
   * Optional alignment for the header title.
   * @default BottomSheetHeaderAlignment.Center
   */
  alignment?: BottomSheetHeaderAlignment;
}

/**
 * Style sheet input parameters.
 */
export type BottomSheetHeaderStyleSheetVars = Pick<
  BottomSheetHeaderProps,
  'style' | 'alignment'
>;
