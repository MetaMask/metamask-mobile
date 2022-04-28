import { BaseAvatarProps } from '../../Base/BaseAvatar/BaseAvatar.types';
export enum AccountAvatarType {
  JazzIcon = 'JazzIcon',
  Blockies = 'Blockies',
}

export interface AccountAvatarProps extends BaseAvatarProps {
  /**
   * type: Account Avatar can be JazzIcon or Blockies
   */
  type: AccountAvatarType;
  /**
   * The accountAddress prop takes an 42 character address and uses it either render a blockie or jazzicon.
   */
  accountAddress: string;
}
