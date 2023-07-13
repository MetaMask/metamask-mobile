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
   * Optional prop to include content to be displayed before the title.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional prop to include content to be displayed after the title.
   */
  endAccessory?: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type HeaderStyleSheetVars = Pick<HeaderProps, 'style'> & {
  startAccessorySize: { width: number; height: number } | null;
  endAccessorySize: { width: number; height: number } | null;
};
