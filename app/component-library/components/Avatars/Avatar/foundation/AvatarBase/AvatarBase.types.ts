// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies
import { AvatarVariant, AvatarSize } from '../../Avatar.types';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends ViewProps {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariant;
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
