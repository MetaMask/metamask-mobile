// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies
import { AvatarSize } from '../../Avatar.types';

/**
 * AvatarBase component props.
 */
export interface AvatarBaseProps extends ViewProps {
  /**
   * Optional enum to select between Avatar sizes.
   * @default AvatarSize.Md
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
