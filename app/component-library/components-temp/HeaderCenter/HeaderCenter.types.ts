// External dependencies.
import { ButtonIconProps } from '@metamask/design-system-react-native';

// Internal dependencies.
import { HeaderBaseProps } from '../../components/HeaderBase';

/**
 * HeaderCenter component props.
 */
export interface HeaderCenterProps extends HeaderBaseProps {
  /**
   * Title text to display in the header.
   * Used as children if children prop is not provided.
   * Rendered with TextVariant.BodyMdMedium.
   */
  title?: string;
  /**
   * Callback when the close button is pressed.
   * If provided, a close button will be added to endButtonIconProps.
   */
  onClose?: () => void;
  /**
   * Additional props to pass to the close ButtonIcon.
   * If provided, a close button will be added to endButtonIconProps with these props spread.
   */
  closeButtonProps?: Omit<ButtonIconProps, 'iconName'>;
}
