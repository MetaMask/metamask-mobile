import { HeaderBaseProps } from '../../HeaderBase/HeaderBase.types';
import { ButtonIconProps } from '../../Buttons/ButtonIcon/ButtonIcon.types';

// Enums
export enum BottomSheetHeaderVariant {
  Display = 'display',
  Compact = 'compact',
}

/**
 * BottomSheetHeader component props.
 */
export interface BottomSheetHeaderProps
  extends Omit<HeaderBaseProps, 'variant'> {
  /**
   * Optional function to trigger when pressing the back button.
   */
  onBack?: () => void;
  /**
   * Optional props to pass to the back button component.
   */
  backButtonProps?: Partial<
    Omit<ButtonIconProps, 'iconName' | 'iconColor' | 'onPress'>
  >;
  /**
   * Optional function to trigger when pressing the close button.
   */
  onClose?: () => void;
  /**
   * Optional props to pass to the close button component.
   */
  closeButtonProps?: Partial<
    Omit<ButtonIconProps, 'iconName' | 'iconColor' | 'onPress'>
  >;
  /**
   * Optional prop to set the variant of the header (controls alignment and text size).
   * Display: left aligned with HeadingLG text.
   * Compact: center aligned with HeadingSM text.
   * @default BottomSheetHeaderVariant.Compact
   */
  variant?: BottomSheetHeaderVariant;
}

/**
 * Style sheet input parameters.
 */
export type BottomSheetHeaderStyleSheetVars = Pick<
  BottomSheetHeaderProps,
  'style'
>;
