// External dependencies.
import { TextVariants } from '../../../../Texts/Text';
import { AvatarSize, AvatarVariants } from '../../Avatar.types';
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarInitial component props.
 */
export interface AvatarInitialProps extends AvatarBaseProps {
  /**
   * Avatar variants.
   */
  variant: AvatarVariants.Initial;
  /**
   * An Ethereum wallet address.
   */
  initial: string;
}

/**
 * Style sheet input parameters.
 */
export type AvatarInitialStyleSheetVars = Pick<
  AvatarInitialProps,
  'size' | 'style'
>;

/**
 * Mapping of TextVariant by AvatarSize.
 */
export type TextVariantByAvatarSize = {
  [key in AvatarSize]: TextVariants;
};
