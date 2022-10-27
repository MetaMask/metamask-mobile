// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies
import { AvatarVariants } from '../../Avatar.types';
import { AvatarProps } from '../../../../../../component-library/components/Avatars/Avatar/Avatar.types';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends ViewProps, Pick<AvatarProps, 'size'> {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants;
}
