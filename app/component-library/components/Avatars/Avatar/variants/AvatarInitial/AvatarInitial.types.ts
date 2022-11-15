// Third party dependencies.
import { ColorValue } from 'react-native';
import { CirclePatternProps } from '../../../../../patterns/Circles/Circle';

// External dependencies.
import { TextVariants } from '../../../../Texts/Text';
import { AvatarSizes, AvatarVariants } from '../../Avatar.types';

/**
 * AvatarInitial component props.
 */
export type AvatarInitialProps = CirclePatternProps & {
  /**
   * Avatar variants.
   */
  variant?: AvatarVariants.Initial;
  /**
   * An initial to be displayed in the Avatar.
   */
  initial: string;
  /**
   * Optional enum to add color to the initial text.
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
