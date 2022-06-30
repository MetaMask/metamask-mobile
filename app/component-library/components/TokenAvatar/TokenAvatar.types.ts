import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

/**
 * TokenAvatar component props.
 */
export interface TokenAvatarProps extends BaseAvatarProps {
  /**
   * Token name.
   */
  tokenName?: string;
  /**
   * Token image URL.
   */
  tokenImageUrl?: string;
}

export type TokenAvatarStyleSheetVars = Pick<
  TokenAvatarProps,
  'size' | 'style'
>;
