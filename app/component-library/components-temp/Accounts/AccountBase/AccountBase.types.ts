import type { BadgeNetworkProps } from '@metamask/design-system-react-native';
import { AvatarAccountType } from '../../../components/Avatars/Avatar';

export interface AccountBaseProps {
  /**
   * Available balance of the account in native currency.
   */
  accountBalance?: number;
  /**
   * Available balance of the account for a token, formatted string.
   */
  accountTokenBalance?: string;
  /**
   * Native currency of the account.
   */
  accountNativeCurrency?: string;
  /**
   * Current network of the account.
   */
  accountNetwork: string;
  /**
   * Name of the account.
   * @default 'Account 1'
   */
  accountName: string;
  /**
   * Action balance title
   */
  accountBalanceLabel: string;
  /**
   * Account address
   */
  accountAddress: string;
  /**
   * Network badge props for the account avatar wrapper
   */
  badgeProps: Pick<BadgeNetworkProps, 'name' | 'src'>;
  /**
   * i18n string of account type label
   */
  accountTypeLabel?: string;
  /**
   * Account identicon
   */
  avatarAccountType: AvatarAccountType;
}
