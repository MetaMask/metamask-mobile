import { AvatarProps } from '../Avatar/Avatar.types';

/**
 * AvatarToken component props.
 */
export interface AvatarTokenProps extends AvatarProps {
  /**
   * Token name.
   */
  tokenName?: string;
  /**
   * Token image URL.
   */
  tokenImageUrl?: string;
  /**
   * Optional boolean to activate halo effect.
   * @default false
   */
  showHalo?: boolean;
}

export type AvatarTokenStyleSheetVars = Pick<
  AvatarTokenProps,
  'size' | 'showHalo' | 'style'
> & {
  showFallback: boolean;
};
