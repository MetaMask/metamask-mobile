// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarAccount variants.
 */
export enum AvatarAccountType {
  JazzIcon = 'JazzIcon',
  Blockies = 'Blockies',
  Maskicon = 'Maskicon',
}

/**
 * Border radius mapping by avatar size.
 */
export interface BorderRadiusByAvatarSize {
  [key: string]: number;
}

/**
 * AvatarAccount component props.
 */
export interface AvatarAccountProps extends AvatarBaseProps {
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * Optional enum to select the avatar type between `JazzIcon`, `Blockies`, and `Maskicon`.
   * @default JazzIcon
   */
  type?: AvatarAccountType;
}

/**
 * Style sheet input parameters.
 */
export type AvatarAccountStyleSheetVars = Pick<
  AvatarAccountProps,
  'style' | 'size'
>;
