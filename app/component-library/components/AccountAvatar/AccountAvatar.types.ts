import { AvatarProps } from '../Avatar/Avatar.types';

/**
 * AccountAvatar variants.
 */
export enum AccountAvatarType {
  JazzIcon = 'JazzIcon',
  Blockies = 'Blockies',
}

/**
 * AccountAvatar component props.
 */
export interface AccountAvatarProps extends AvatarProps {
  /**
   * Enum to select the avatar type between `JazzIcon` and `Blockies`.
   */
  type: AccountAvatarType;
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
}
