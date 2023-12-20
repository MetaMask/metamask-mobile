// External dependencies.
import { HeaderBaseProps } from '../../HeaderBase/HeaderBase.types';

/**
 * SelectHeader component props.
 */
export interface SelectHeaderProps extends HeaderBaseProps {
  /**
   * Optional prop for the title of the SelectHeader
   */
  title?: string | React.ReactNode;
  /**
   * Optional description below the title
   */
  description?: string | React.ReactNode;
}
