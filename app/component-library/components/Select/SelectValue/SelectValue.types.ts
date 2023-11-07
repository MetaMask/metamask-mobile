// Third party dependencies.
import { ReactElement } from 'react';

// External dependencies.
import { AvatarProps } from '../../Avatars/Avatar';

// Internal dependencies.
import { SelectValueBaseProps } from './foundation/SelectValueBase.types';

/**
 * SelectValue component props.
 */
export interface SelectValueProps extends SelectValueBaseProps {
  /**
   * Optional prop for Icon.
   */
  iconEl?: ReactElement<AvatarProps>;
  /**
   * Optional prop for Icon.
   */
  iconProps?: AvatarProps;
  /**
   * Optional prop for label of the SelectValue.
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
