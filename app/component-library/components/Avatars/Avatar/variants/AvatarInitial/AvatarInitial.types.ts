// External dependencies.
import { TextVariants } from '../../../../Texts/Text';
import { AvatarSizes, AvatarVariants } from '../../Avatar.types';
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarInitial component props.
 */
export type AvatarInitialProps = AvatarBaseProps & {
  /**
   * Avatar variants.
   */
  variant?: AvatarVariants.Initial;
  /**
   * An initial to be displayed in the Avatar.
   */
  initial: string;
};

/**
 * Style sheet input parameters.
 */
export type AvatarInitialStyleSheetVars = Pick<
  AvatarInitialProps,
  'size' | 'style'
>;

/**
 * Mapping of TextVariant by AvatarSizes.
 */
export type TextVariantByAvatarSizes = {
  [key in AvatarSizes]: TextVariants;
};
