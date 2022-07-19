import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

interface TokenMetadata {
  /**
   * Token id.
   */
  id: string;
  /**
   * Token Name.
   */
  name: string;
  /**
   * Token image url.
   */
  imageUrl: string;
}

/**
 * StackedAvatars component props.
 */
export interface StackedAvatarsProps extends Omit<BaseAvatarProps, 'size'> {
  /**
   * A list of Avatars to be horizontally stacked.
   */
  tokenList: TokenMetadata[];
}
