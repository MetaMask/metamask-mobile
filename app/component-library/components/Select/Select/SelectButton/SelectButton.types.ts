// External dependencies.
import { SelectButtonSize } from '../../../../base-components/Select/BaseSelectButton';
import { AvatarSize } from '../../../Avatars/Avatar';
import { BaseSelectButtonProps } from '../../../../base-components/Select/BaseSelectButton/BaseSelectButton.types';
import { ListItemProps } from '../../../ListItem/ListItem/ListItem.types';

export type StartIconIconSizeBySelectButtonSize = {
  [key in SelectButtonSize]: AvatarSize;
};

/**
 * SelectButton component props.
 */
export interface SelectButtonProps
  extends Omit<BaseSelectButtonProps, 'children'> {
  value?: ListItemProps;
}

/**
 * Style sheet SelectButton parameters.
 */
export type SelectButtonStyleSheetVars = Pick<SelectButtonProps, 'style'>;
