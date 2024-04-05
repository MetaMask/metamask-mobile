// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { ButtonProps } from '../../../../Buttons/Button/Button.types';
import { ButtonIconProps } from '../../../../Buttons/ButtonIcon/ButtonIcon.types';
import { BannerVariant } from '../../Banner.types';

/**
 * BannerBase component props.
 */
export interface BannerBaseProps extends ViewProps {
  /**
   * Variant of Banner
   */
  variant?: BannerVariant;
  /**
   * Optional content to be displayed before the info section.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional prop for title of the Banner.
   */
  title?: string | React.ReactNode;
  /**
   * Optional description below the title.
   */
  description?: string | React.ReactNode;
  /**
   * Optional prop to control the action button's props.
   */
  actionButtonProps?: ButtonProps;
  /**
   * Optional function to trigger when pressing the close button.
   */
  onClose?: () => void;
  /**
   * Optional prop to control the close button's props.
   */
  closeButtonProps?: ButtonIconProps;
  /**
   * Optional prop to add children components to the Banner.
   */
  children?: React.ReactNode;
}

/**
 * Style sheet Banner Base parameters.
 */
export type BannerBaseStyleSheetVars = Pick<BannerBaseProps, 'style'>;
