// Third party dependencies.
import { PressableProps } from 'react-native';

// External dependencies.
import { IconProps, IconName } from '@metamask/design-system-react-native';
import { TextProps } from '../../components/Texts/Text/Text.types';

/**
 * ActionListItem component props.
 */
export interface ActionListItemProps extends PressableProps {
  /**
   * Label text or component to display.
   */
  label: string | React.ReactNode;
  /**
   * Optional description text or component to display below the label.
   */
  description?: string | React.ReactNode;
  /**
   * Optional content to display at the start of the item.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional content to display at the end of the item.
   */
  endAccessory?: React.ReactNode;
  /**
   * Optional icon name to display at the start of the item.
   */
  iconName?: IconName;
  /**
   * Optional props for the label text component.
   */
  labelTextProps?: TextProps;
  /**
   * Optional props for the description text component.
   */
  descriptionTextProps?: TextProps;
  /**
   * Optional props for the icon component.
   */
  iconProps?: IconProps;
}
