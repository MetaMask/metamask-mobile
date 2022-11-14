// Third party dependencies.
import { ImagePropsBase } from 'react-native';

// External dependencies.
import { CirclePatternProps } from '../../../patterns/Circles/Circle';

/**
 * Favicon sizes and badge positions.
 */
export {
  CirclePatternSizes as FaviconSizes,
  CirclePatternBadgePositions as FaviconBadgePositions,
} from '../../../patterns/Circles/Circle/Circle.types';

/**
 * Favicon component props.
 */
export type FaviconProps = CirclePatternProps & {
  /**
   * Props for the image content.
   */
  imageProps: ImagePropsBase;
};

/**
 * Style sheet input parameters.
 */
export type FaviconStyleSheetVars = Pick<FaviconProps, 'style' | 'size'>;
