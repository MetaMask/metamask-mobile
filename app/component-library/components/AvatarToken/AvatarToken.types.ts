import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

/**
 * AvatarToken component props.
 */
export interface AvatarTokenProps extends BaseAvatarProps {
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

export type AvatarTokenStyleSheetVars = Pick<
  AvatarTokenProps,
  'size' | 'showHalo' | 'style'
> & {
  showFallback: boolean;
};
