import { AvatarAccountProps } from '../../../components/Avatars/AvatarAccount/AvatarAccount.types';

export interface AccountBaseProps {
  /**
   * Available balance of the account in native currency.
   */
  accountBalance: number;
  /**
   * Native currency of the account.
   */
  accountNativeCurrency: string;
  /**
   * Current network of the account.
   */
  accountNetwork: string;
  /**
   * Type of the account.
   * @default 'Account 1'
   */
  accountType: string;
  /**
   * Action balance title
   */
  accountBalanceLabel: string;
  /**
   * Props for avatar component (with the exception of size).
   * Avatar size is restricted to size Md (32x32) for Cells
   */
  avatarProps: AvatarAccountProps;
}
