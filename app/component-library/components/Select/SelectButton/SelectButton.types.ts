// Third party dependencies.
import { ReactElement } from 'react';

// External dependencies.
import Avatar, { AvatarProps } from '../../Avatars/Avatar';
import AvatarAccount from '../../Avatars/Avatar/variants/AvatarAccount';
import AvatarFavicon from '../../Avatars/Avatar/variants/AvatarFavicon';
import AvatarIcon from '../../Avatars/Avatar/variants/AvatarIcon';
import AvatarNetwork from '../../Avatars/Avatar/variants/AvatarNetwork';
import AvatarToken from '../../Avatars/Avatar/variants/AvatarToken';
import { IconSize } from '../../Icons/Icon';

// Internal dependencies.
import { SelectButtonBaseProps } from './foundation/SelectButtonBase.types';

type AcceptableIcons =
  | typeof Avatar
  | typeof AvatarAccount
  | typeof AvatarFavicon
  | typeof AvatarIcon
  | typeof AvatarNetwork
  | typeof AvatarToken;

/**
 * SelectButton sizes
 */
export enum SelectButtonSize {
  Sm = 'Sm',
  Md = 'Md',
  Lg = 'Lg',
}

/**
 * Mapping of IconSize by SelectButtonSize.
 */
export type IconSizeBySelectButtonSize = {
  [key in SelectButtonSize]: IconSize;
};

/**
 * SelectButton component props.
 */
export interface SelectButtonProps extends SelectButtonBaseProps {
  /**
   * Optional enum to select between SelectButton sizes.
   * @default Md
   */
  size?: SelectButtonSize;
  /**
   * Optional prop for Icon.
   */
  iconEl?: ReactElement<AcceptableIcons>;
  /**
   * Optional prop for Icon.
   */
  iconProps?: AvatarProps;
  /**
   * Optional prop for title of the SelectButton.
   */
  title?: string | React.ReactNode;
  /**
   * Optional description below the title.
   */
  description?: string | React.ReactNode;
  /**
   * Optional prop to configure the disabled state.
   */
  isDisabled?: boolean;
  /**
   * Optional prop to configure the danger state.
   */
  isDanger?: boolean;
}

/**
 * Style sheet SelectButton parameters.
 */
export type SelectButtonStyleSheetVars = Pick<SelectButtonProps, 'style'> & {
  size: SelectButtonSize;
  isDisabled: boolean;
  isDanger: boolean;
};
