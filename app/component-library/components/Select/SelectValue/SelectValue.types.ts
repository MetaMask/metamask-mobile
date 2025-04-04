// Third party dependencies.
import { ReactElement } from 'react';

// External dependencies.
import { AvatarProps } from '../../Avatars/Avatar/Avatar.types';

// Internal dependencies.
import { SelectValueBaseProps } from './foundation/SelectValueBase.types';

/**
 * SelectValue component props.
 */
export interface SelectValueProps extends SelectValueBaseProps {
  /**
   * Optional prop to replace the start Icon Element.
   */
  iconEl?: ReactElement<AvatarProps>;
  /**
   * Optional prop for the start Icon props.
   */
  iconProps?: AvatarProps;
  /**
   * Optional prop for the label of SelectValue.
   */
  label?: string | React.ReactNode;
  /**
   * Optional description below the label.
   */
  description?: string | React.ReactNode;
}

/**
 * Style sheet SelectValue parameters.
 */
export type SelectValueStyleSheetVars = Pick<SelectValueProps, 'style'>;
