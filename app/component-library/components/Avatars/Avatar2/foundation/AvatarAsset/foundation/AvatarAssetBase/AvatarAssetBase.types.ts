// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { AvatarAssetVariants } from '../../AvatarAsset.types';

/**
 * AvatarAssetBase component props.
 */
export interface AvatarAssetBaseProps extends ViewProps {
  /**
   * Avatar Asset variants.
   */
  variant: AvatarAssetVariants;
  /**
   * Content to wrap to display.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type AvatarAssetBaseStyleSheetVars = Pick<AvatarAssetBaseProps, 'style'>;
