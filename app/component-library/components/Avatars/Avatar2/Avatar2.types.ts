// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Avatar sizes.
 */
export enum AvatarSize {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * Avatar2 component props.
 */
export interface Avatar2Props extends ViewProps {
  /**
   * Optional enum to select between Avatar sizes.
   * @default Md
   */
  size?: AvatarSize;
  /**
   * Optional boolean to activate halo effect.
   * @default false
   */
  isHaloEnabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type Avatar2StyleSheetVars = Pick<
  Avatar2Props,
  'size' | 'isHaloEnabled' | 'style'
>;
