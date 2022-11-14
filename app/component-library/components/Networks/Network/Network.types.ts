// Third party dependencies.
import { ImagePropsBase } from 'react-native';

// External dependencies.
import { CirclePatternProps } from '../../../patterns/Circles/Circle';

/**
 * Network sizes and badge positions.
 */
export {
  CirclePatternSizes as NetworkSizes,
  CirclePatternBadgePositions as NetworkBadgePositions,
} from '../../../patterns/Circles/Circle/Circle.types';

/**
 * Network component props.
 */
export type NetworkProps = CirclePatternProps & {
  /**
   * Props for the image content.
   */
  imageProps?: ImagePropsBase;
  /**
   * Optional network name.
   */
  name?: string;
};

/**
 * Style sheet input parameters.
 */
export type NetworkStyleSheetVars = Pick<NetworkProps, 'style' | 'size'>;
