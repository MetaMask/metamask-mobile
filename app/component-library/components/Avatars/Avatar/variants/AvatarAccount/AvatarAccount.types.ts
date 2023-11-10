// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { AvatarVariant } from '../../Avatar.types';

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
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariant.Account;
  /**
   * Optional enum to select the avatar type between `JazzIcon` and `Blockies`.
   * @default JazzIcon
   */
  type?: AvatarAccountType;
}
