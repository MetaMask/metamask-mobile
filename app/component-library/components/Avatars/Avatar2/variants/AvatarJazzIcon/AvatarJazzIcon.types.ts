// Third party dependencies.
import { IJazziconProps } from 'react-native-jazzicon';

// External dependencies.
import { AvatarVariants } from '../../Avatar2.types';
import { Avatar2BaseProps } from '../../foundation/Avatar2Base';

/**
 * AvatarJazzIcon component props.
 */
export interface AvatarJazzIconProps
  extends Avatar2BaseProps,
    Omit<IJazziconProps, 'size'> {
  /**
   * Avatar variants.
   */
  variant: AvatarVariants.JazzIcon;
}
