// Third party dependencies.
import { IJazziconProps } from 'react-native-jazzicon';

// External dependencies.
import { AvatarVariants } from '../../Avatar.types';
import { AvatarBaseProps } from '../../foundation/AvatarBase';

export type AvatarJazzIconProps = AvatarBaseProps &
  Omit<IJazziconProps, 'size'> & {
    /**
     * Avatar variants.
     */
    variant?: AvatarVariants.JazzIcon;
  };
