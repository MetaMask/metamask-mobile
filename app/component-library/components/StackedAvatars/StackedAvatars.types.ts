import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';
/**
 * StackedAvatars component props.
 */

interface TokenMetadata {
  id: string;
  name: string;
  imageUrl: string;
}

export interface StackedAvatarsProps extends Omit<BaseAvatarProps, 'size'> {
  /**
   * A list of Avatars to be horizontally stacked.
   */
  tokenList: TokenMetadata[];
}
