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
