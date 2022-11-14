// Third party dependencies.
import { ImagePropsBase } from 'react-native';

// External dependencies.
import { CirclePatternProps } from '../../../patterns/Circles/Circle';

/**
 * Token sizes.
 */
export { CirclePatternSizes as TokenSizes } from '../../../patterns/Circles/Circle/Circle.types';

/**
 * Token component props.
 */
export type TokenProps = CirclePatternProps & {
  /**
   * Optional token name.
   */
  name?: string;
  /**
   * Props for the image content.
   */
  imageProps: ImagePropsBase;
  /**
   * Optional boolean to activate halo effect.
   * @default true
   */
  isHaloEnabled?: boolean;
};

/**
 * Style sheet input parameters.
 */
export type TokenStyleSheetVars = Pick<
  TokenProps,
  'style' | 'size' | 'isHaloEnabled'
>;
