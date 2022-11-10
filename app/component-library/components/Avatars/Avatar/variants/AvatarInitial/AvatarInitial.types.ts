import { ColorValue } from 'react-native';

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
  /**
   * Optional enum to add color to the initial.
   * @default theme.colors.text.default
   */
  initialColor?: ColorValue;
  /**
   * Optional enum to add color to the background of the Avatar.
   * @default theme.colors.background.alternative
   */
  backgroundColor?: ColorValue;
};

/**
 * Style sheet input parameters.
 */
export type AvatarInitialStyleSheetVars = Pick<
  AvatarInitialProps,
  'size' | 'initialColor' | 'backgroundColor'
>;

/**
 * Mapping of TextVariant by AvatarSizes.
 */
export type TextVariantByAvatarSizes = {
  [key in AvatarSizes]: TextVariants;
};
