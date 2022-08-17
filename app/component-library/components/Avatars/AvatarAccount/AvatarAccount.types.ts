// External dependencies.
import { AvatarBaseProps } from '../AvatarBase';
import { AvatarVariants } from '../Avatar.types';

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
export interface AvatarAccountProps extends AvatarBaseProps {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants.Account;
  /**
   * Optional enum to select the avatar type between `JazzIcon` and `Blockies`.
   * @default JazzIcon
   */
  type?: AvatarAccountType;
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
}
