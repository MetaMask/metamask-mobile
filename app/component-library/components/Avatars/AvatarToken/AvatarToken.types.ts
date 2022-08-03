import { AvatarBaseProps } from '../AvatarBase/AvatarBase.types';

/**
 * AvatarToken component props.
 */
export interface AvatarTokenProps extends AvatarBaseProps {
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
