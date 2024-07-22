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
 * Mapping of space between avatars by AvatarSize.
 */
export type SpaceBetweenAvatarsByAvatarSize = {
  [key in AvatarSize]: number;
};

/**
 * Mapping of overflow text margin by AvatarSize.
 */
export type OverflowTextMarginByAvatarSize = {
  [key in AvatarSize]: number;
};

/**
 * AvatarGroup component props.
 */
export interface AvatarGroupProps extends ViewProps {
  /**
   * A list of Avatars to be horizontally stacked.
   * Note: AvatarGroupProps's size and includesBorder prop will overwrite
   * each individual avatarProp's size and includesBorder prop
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
  /**
   * Optional boolean to includes border or not.
   * @default false
   */
  includesBorder?: boolean;
  /**
   * Optional enum to configure the space between avatars.
   * Note:
   * - Negative values for this prop will result in the Avatars moving
   * closer to each other, positive values for this prop will result
   * in the Avatars moving away from each other.
   * - The default values of the space between avatars depend on the size.
   * - Please refer to the constants file for the mappings.
   */
  spaceBetweenAvatars?: number;
}
export interface AvatarGroupStyleSheetVars
  extends Pick<AvatarGroupProps, 'style'> {
  size: AvatarSize;
}
