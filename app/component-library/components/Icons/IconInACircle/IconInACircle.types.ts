// Third party dependencies.
import { ColorValue } from 'react-native';

// External dependencies.
import { CirclePatternProps } from '../../../patterns/Circles/Circle';
import { IconProps } from '../Icon';

/**
 * IconInACircle sizes.
 */
export { CirclePatternSizes as IconInACircleSizes } from '../../../patterns/Circles/Circle/Circle.types';

/**
 * IconInACircle component props.
 */
export type IconInACircleProps = CirclePatternProps & {
  /**
   * Optional enum to add color to the background of the Avatar.
   * @default theme.colors.background.alternative
   */
  backgroundColor?: ColorValue;
  /**
   * Props for the icon content
   */
  iconProps: IconProps;
};

/**
 * Style sheet input parameters.
 */
export type IconInACircleStyleSheetVars = Pick<
  IconInACircleProps,
  'style' | 'backgroundColor'
>;
