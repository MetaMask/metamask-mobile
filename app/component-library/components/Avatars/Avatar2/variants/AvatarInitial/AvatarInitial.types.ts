// External dependencies.
import { TextVariants } from '../../../../Texts/Text';
import { AvatarSize, AvatarVariants } from '../../Avatar2.types';
import { Avatar2BaseProps } from '../../foundation/Avatar2Base';

/**
 * AvatarInitial component props.
 */
export interface AvatarInitialProps extends Avatar2BaseProps {
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
