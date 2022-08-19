// Third party dependencies.
import { KeyringTypes } from '@metamask/controllers';

// External dependencies.
import { AvatarGroupToken } from '../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.types';

/**
 * Asset information associated with the account, which includes both the fiat balance and owned tokens.
 */
export interface Assets {
  /**
   * Fiat balance in string format.
   */
  fiatBalance: string;
  /**
   * Tokens owned by this account.
   */
  tokens: AvatarGroupToken[];
}

/**
 * Account information.
 */
export interface Account {
  /**
   * Account name.
   */
  name: string;
  /**
   * Account address.
   */
  address: string;
  /**
   * Asset information associated with the account, which includes both the fiat balance and owned tokens.
   */
  assets?: Assets;
  /**
   * Account type.
   */
  type: KeyringTypes;
  /**
   * Y offset of the item. Used for scrolling purposes.
   */
  yOffset: number;
}

/**
 * AccountSelectorList props.
 */
export interface AccountSelectorListProps {
  /**
   * List of accounts.
   */
  accounts: Account[];
  /**
   * Optional callback to trigger when account is selected.
   */
  onSelectAccount?: (address: string) => void;
}
