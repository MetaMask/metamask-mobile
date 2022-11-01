// External dependencies.
import { AvatarVariants } from '../../Avatar.types';
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarAccount variants.
 */
export enum AvatarAccountType {
  JazzIcon = 'JazzIcon',
  Blockies = 'Blockies',
}

/**
 * AvatarAccount component props.
 */
export type AvatarAccountProps = AvatarBaseProps & {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants.Account;
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * Optional enum to select the avatar type between `JazzIcon` and `Blockies`.
   * @default JazzIcon
   */
  type?: AvatarAccountType;
};
