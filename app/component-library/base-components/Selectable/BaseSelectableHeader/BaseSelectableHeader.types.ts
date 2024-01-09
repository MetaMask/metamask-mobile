// External dependencies.
import { HeaderBaseProps } from '../../../components/HeaderBase/HeaderBase.types';

/**
 * BaseSelectableHeader component props.
 */
export interface BaseSelectableHeaderProps extends Partial<HeaderBaseProps> {
  /**
   * Optional prop for the title of the BaseSelectableHeader
   */
  title?: string | React.ReactNode;
  /**
   * Optional description below the title
   */
  description?: string | React.ReactNode;
}
