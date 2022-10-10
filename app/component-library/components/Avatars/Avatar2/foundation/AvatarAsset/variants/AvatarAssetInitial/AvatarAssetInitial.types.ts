// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { TextVariants } from '../../../../../../Texts/Text';
import { AvatarAssetVariants } from '../../AvatarAsset.types';
import { AvatarSize } from '../../../../Avatar2.types';

/**
 * AvatarAssetInitial component props.
 */
export interface AvatarAssetInitialProps extends ViewProps {
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
