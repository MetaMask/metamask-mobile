// External dependencies
import { AvatarVariants } from '../../Avatar.types';
import { AvatarBaseProps as MorphAvatarBaseProps } from '../../../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends Omit<MorphAvatarBaseProps, 'variant'> {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants;
}
