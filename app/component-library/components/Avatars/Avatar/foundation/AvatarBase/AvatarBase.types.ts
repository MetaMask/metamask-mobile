// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies
import { AvatarVariants, AvatarSize } from '../../Avatar.types';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends ViewProps {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants;
  /**
   * Optional enum to select between Avatar sizes.
   * @default Md
   */
  size?: AvatarSize;
}

/**
 * Style sheet input parameters.
 */
export interface AvatarBaseStyleSheetVars
  extends Pick<AvatarBaseProps, 'style'> {
  size: AvatarSize;
}
