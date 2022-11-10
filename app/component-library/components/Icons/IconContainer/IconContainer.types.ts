// Third party dependencies.
import { ColorValue } from 'react-native';

// External dependencies.
import { CoinPatternProps } from '../../../patterns/Coins/Coin';
import { IconProps } from '../../Icons/Icon';

/**
 * IconContainer sizes.
 */
export { CoinPatternSizes as IconContainerSizes } from '../../../patterns/Coins/Coin/Coin.types';

/**
 * IconContainer component props.
 */
export type IconContainerProps = CoinPatternProps &
  Omit<IconProps, 'size'> & {
    /**
     * Optional enum to add color to the background of the Avatar.
     * @default theme.colors.background.alternative
     */
    backgroundColor?: ColorValue;
  };

/**
 * Style sheet input parameters.
 */
export type IconContainerStyleSheetVars = Pick<
  IconContainerProps,
  'style' | 'backgroundColor'
>;
