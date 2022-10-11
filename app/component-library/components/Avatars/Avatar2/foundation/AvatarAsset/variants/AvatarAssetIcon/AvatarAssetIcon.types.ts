// External dependencies.
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { AvatarAssetBaseProps } from '../../foundation/AvatarAssetBase/AvatarAssetBase.types';
import { IconProps } from '../../../../../../Icon';

/**
 * AvatarAssetIcon component props.
 */
export interface AvatarAssetIconProps extends AvatarAssetBaseProps, IconProps {
  /**
   * Avatar Asset variants.
   */
  variant: AvatarAssetVariants.Icon;
}
