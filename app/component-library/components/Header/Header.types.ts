// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Header component props.
 */
export interface HeaderProps extends ViewProps {
  /**
   * Title of the Header.
   */
  children: React.ReactNode;
  /**
   * Content to be displayed before the title.
   */
  startAccessory?: React.ReactNode;
  /**
   * Content to be displayed after the title.
   */
  endAccessory?: React.ReactNode;
}
