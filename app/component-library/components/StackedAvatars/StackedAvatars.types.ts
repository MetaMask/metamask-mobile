import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';
/**
 * StackedAvatars component props.
 */

export interface StackedAvatarsProps extends Pick<BaseAvatarProps, 'size'> {
  /**
   * A list of Avatars to be horizontally stacked.
   */
  avatarList?: JSX.Element[];
}
