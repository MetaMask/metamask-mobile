// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies
import { AvatarVariants, AvatarSize } from '../../Avatar2.types';

/**
 * Avatar2Base component props.
 */
export interface Avatar2BaseProps extends ViewProps {
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
export interface Avatar2BaseStyleSheetVars
  extends Pick<Avatar2BaseProps, 'style'> {
  size: AvatarSize;
}
