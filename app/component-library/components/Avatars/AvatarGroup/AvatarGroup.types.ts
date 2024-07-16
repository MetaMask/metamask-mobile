// Third party dependencies
import { ViewProps } from 'react-native';

// External dependencies
import { AvatarProps, AvatarSize } from '../Avatar/Avatar.types';
import { TextVariant } from '../../Texts/Text';

/**
 * Mapping of TextVariant by AvatarSize.
 */
export type TextVariantByAvatarSize = {
  [key in AvatarSize]: TextVariant;
};

/**
 * AvatarGroup component props.
 */
export interface AvatarGroupProps extends ViewProps {
  /**
   * A list of Avatars to be horizontally stacked.
   * Note: AvatarGroupProps's size prop will overwrite each individual
   * avatarProp's size
   */
  avatarPropsList: AvatarProps[];
  /**
   * Optional enum to select between Avatar Group sizes.
   * @default AvatarSize.Xs
   */
  size?: AvatarSize;
  /**
   * Optional enum to select max number of Avatars visible,
   * before the overflow counter being displayed
   * @default 4
   */
  maxStackedAvatars?: number;
}

export type AvatarGroupStyleSheetVars = Pick<AvatarGroupProps, 'style'>;
