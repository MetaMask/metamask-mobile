// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { TextProps } from '../../../../Texts/Text/Text.types';
import { ButtonProps } from '../../../../Buttons/Button/Button.types';
import { ButtonIconProps } from '../../../../Buttons/ButtonIcon/ButtonIcon.types';

/**
 * BannerBase component props.
 */
export interface BannerBaseProps extends ViewProps {
  /**
   * Content to be displayed before the info section.
   */
  startAccessory?: React.ReactNode;
  /**
   * Title of the Banner.
   */
  title?: string;
  /**
   * Optional prop to control the title's props.
   */
  titleProps?: TextProps;
  /**
   * Optional description below the title.
   */
  description?: string;
  /**
   * For custom description with links, pass in node element.
   */
  descriptionEl?: React.ReactNode;
  /**
   * Label for optional action button below the description and title.
   */
  actionButtonLabel?: string;
  /**
   * Function to trigger when pressing the action button.
   */
  actionButtonOnPress?: () => void;
  /**
   * Optional prop to control the action button's props.
   */
  actionButtonProps?: ButtonProps;
  /**
   * Function to trigger when pressing the close button.
   */
  onClose?: () => void;
  /**
   * Optional prop to control the close button's props.
   */
  closeButtonProps?: ButtonIconProps;
}
