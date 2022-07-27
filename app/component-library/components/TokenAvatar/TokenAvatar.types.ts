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
  /**
   * Boolean to activate halo effect.
   */
  showHalo?: boolean;
}

export type TokenAvatarStyleSheetVars = Pick<
  TokenAvatarProps,
  'size' | 'showHalo' | 'style'
> & {
  showFallback: boolean;
};
