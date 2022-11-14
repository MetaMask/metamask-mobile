// Third party dependencies.
import { ColorValue } from 'react-native';

// External dependencies.
import { CirclePatternProps } from '../../../patterns/Circles/Circle';
import { IconProps } from '../../Icons/Icon';

/**
 * IconContainer sizes.
 */
export { CirclePatternSizes as IconContainerSizes } from '../../../patterns/Circles/Circle/Circle.types';

/**
 * IconContainer component props.
 */
export type IconContainerProps = CirclePatternProps & {
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
export type IconContainerStyleSheetVars = Pick<
  IconContainerProps,
  'style' | 'backgroundColor'
>;
