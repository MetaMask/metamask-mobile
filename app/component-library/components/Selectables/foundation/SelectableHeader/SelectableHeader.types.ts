// External dependencies.
import { HeaderBaseProps } from '../../../HeaderBase/HeaderBase.types';

/**
 * SelectableHeader component props.
 */
export interface SelectableHeaderProps extends Partial<HeaderBaseProps> {
  /**
   * Optional prop for the title of the SelectableHeader
   */
  title?: string | React.ReactNode;
  /**
   * Optional description below the title
   */
  description?: string | React.ReactNode;
}
