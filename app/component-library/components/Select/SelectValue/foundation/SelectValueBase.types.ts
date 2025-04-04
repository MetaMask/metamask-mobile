// External dependencies.
import { ListItemProps } from '../../../List/ListItem/ListItem.types';

/**
 * SelectValueBase component props.
 */
export interface SelectValueBaseProps extends ListItemProps {
  /**
   * Optional content to be displayed before the info section.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional content to be displayed in the info section.
   */
  children?: React.ReactNode;
  /**
   * Optional content to be displayed after the info section.
   */
  endAccessory?: React.ReactNode;
  /**
   * Optional prop for the test ID
   */
  testID?: string | undefined;
}
