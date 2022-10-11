// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { AvatarAssetBaseProps } from '../../foundation/AvatarAssetBase/AvatarAssetBase.types';
import { AvatarSize } from '../../../../Avatar2.types';

/**
 * AvatarAssetImage component props.
 */
export interface AvatarAssetImageProps extends AvatarAssetBaseProps {
  /**
   * Avatar Asset variants.
   */
  variant: AvatarAssetVariants.Image;
  /**
   * Optional token image from either a local or remote source.
   */
  imageSource: ImageSourcePropType;
  /**
   * Size of Avatar.
   */
  size: AvatarSize;
}

/**
 * Style sheet input parameters.
 */
export type AvatarAssetImageStyleSheetVars = Pick<
  AvatarAssetImageProps,
  'size' | 'style'
>;
