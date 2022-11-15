// Third party dependencies.
import { IJazziconProps } from 'react-native-jazzicon';
import { CirclePatternProps } from '../../../../../patterns/Circles/Circle';

// External dependencies.
import { AvatarVariants } from '../../Avatar.types';

export type AvatarJazzIconProps = CirclePatternProps & {
  /**
   * Avatar variants.
   */
  variant?: AvatarVariants.JazzIcon;
  /**
   * Props for the JazzIcon content.
   */
  jazzIconProps: IJazziconProps;
};
