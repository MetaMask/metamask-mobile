// External dependencies.
import { TextVariants } from '../../../../../../Texts/Text';
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { AvatarSize } from '../../../../Avatar2.types';
import { AvatarAssetBaseProps } from '../../foundation/AvatarAssetBase/AvatarAssetBase.types';

/**
 * AvatarAssetInitial component props.
 */
export interface AvatarAssetInitialProps extends AvatarAssetBaseProps {
  /**
   * Avatar Asset variants.
   */
  variant: AvatarAssetVariants.Initial;
  /**
   * An Ethereum wallet address.
   */
  initial: string;
  /**
   * Size of Avatar.
   */
  size: AvatarSize;
}

/**
 * Style sheet input parameters.
 */
export type AvatarAssetInitialStyleSheetVars = Pick<
  AvatarAssetInitialProps,
  'size' | 'style'
>;

/**
 * Mapping of TextVariant by AvatarSize.
 */
export type TextVariantByAvatarSize = {
  [key in AvatarSize]: TextVariants;
};
