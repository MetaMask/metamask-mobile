// Third party dependencies.
import { ReactElement } from 'react';

// External dependencies.
import { AvatarProps } from '../../Avatars/Avatar/Avatar.types';

// Internal dependencies.
import { ValueListItemBaseProps } from './foundation/ValueListItemBase.types';

/**
 * ValueListItem component props.
 */
export interface ValueListItemProps extends ValueListItemBaseProps {
  /**
   * Optional prop to replace the start Icon Element.
   */
  iconEl?: ReactElement<AvatarProps>;
  /**
   * Optional prop for the start Icon props.
   */
  iconProps?: AvatarProps;
  /**
   * Optional prop for the label of ValueListItem.
   */
  label?: string | React.ReactNode;
  /**
   * Optional description below the label.
   */
  description?: string | React.ReactNode;
}

/**
 * Style sheet ValueListItem parameters.
 */
export type ValueListItemStyleSheetVars = Pick<ValueListItemProps, 'style'>;
