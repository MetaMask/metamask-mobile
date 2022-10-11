// Third party dependencies.
import { IJazziconProps } from 'react-native-jazzicon';

// External dependencies.
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { AvatarAssetBaseProps } from '../../foundation/AvatarAssetBase/AvatarAssetBase.types';

/**
 * AvatarAssetJazzIcon component props.
 */
export interface AvatarAssetJazzIconProps
  extends AvatarAssetBaseProps,
    IJazziconProps {
  /**
   * Avatar Asset variants.
   */
  variant: AvatarAssetVariants.JazzIcon;
}

/**
 * Style sheet input parameters.
 */
export type AvatarAssetJazzIconStyleSheetVars = Pick<
  AvatarAssetJazzIconProps,
  'style'
>;
