// Third party dependencies.
import { ReactElement } from 'react';

// External dependencies.
import Avatar, { AvatarProps } from '../../Avatars/Avatar';
import AvatarAccount from '../../Avatars/Avatar/variants/AvatarAccount';
import AvatarFavicon from '../../Avatars/Avatar/variants/AvatarFavicon';
import AvatarIcon from '../../Avatars/Avatar/variants/AvatarIcon';
import AvatarNetwork from '../../Avatars/Avatar/variants/AvatarNetwork';
import AvatarToken from '../../Avatars/Avatar/variants/AvatarToken';

// Internal dependencies.
import { SelectValueBaseProps } from './foundation/SelectValueBase.types';

type AcceptableIcons =
  | typeof Avatar
  | typeof AvatarAccount
  | typeof AvatarFavicon
  | typeof AvatarIcon
  | typeof AvatarNetwork
  | typeof AvatarToken;

/**
 * SelectValue component props.
 */
export interface SelectValueProps extends SelectValueBaseProps {
  /**
   * Optional prop for Icon.
   */
  iconEl?: ReactElement<AcceptableIcons>;
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
