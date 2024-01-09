// External dependencies.
import { BaseSelectButtonProps } from '../BaseSelectButton/BaseSelectButton.types';

// Internal dependencies.
import { BaseSelectableWrapperProps } from '../../Selectable/BaseSelectableWrapper/BaseSelectableWrapper.types';

/**
 * BaseSelectWrapper component props.
 */
export interface BaseSelectWrapperProps extends BaseSelectableWrapperProps {
  value?: React.ReactNode;
  placeholder?: string;
  /**
   * Optional prop for the SelectButton
   */
  selectButtonProps?: BaseSelectButtonProps;
}
