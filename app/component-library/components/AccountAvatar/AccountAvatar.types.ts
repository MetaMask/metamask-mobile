import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

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
export interface AccountAvatarProps extends BaseAvatarProps {
  /**
   * Enum to select the avatar type between `JazzIcon` and `Blockies`.
   */
  type: AccountAvatarType;
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
}
