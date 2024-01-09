// Third party dependencies.
import { ReactElement } from 'react';

// External dependencies.
import { AvatarProps } from '../../Avatars/Avatar/Avatar.types';
import { BaseListItemProps } from '../../../base-components/ListItem/BaseListItem/BaseListItem.types';

/**
 * ListItem component props.
 */
export interface ListItemProps extends BaseListItemProps {
  /**
   * Optional prop to replace the start Icon Element.
   */
  iconEl?: ReactElement<AvatarProps>;
  /**
   * Optional prop for the start Icon props.
   */
  iconProps?: AvatarProps;
  /**
   * Optional prop for the label of ListItem.
   */
  label?: string | React.ReactNode;
  /**
   * Optional description below the label.
   */
  description?: string | React.ReactNode;
}

/**
 * Style sheet ListItem parameters.
 */
export type ListItemStyleSheetVars = Pick<ListItemProps, 'style'>;
