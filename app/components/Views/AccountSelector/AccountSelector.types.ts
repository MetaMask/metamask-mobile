import type { AccountGroupObject } from '@metamask/account-tree-controller';

/**
 * Enum to track states of the account selector screen.
 */
export enum AccountSelectorScreens {
  AccountSelector = 'AccountSelector',
  MultichainAddWalletActions = 'MultichainAddWalletActions',
}

export interface AccountSelectorParams {
  /**
   * Optional callback that is called whenever a new account is being created.
   */
  onCreateNewAccount?: () => void;
  /**
   * Optional callback that is called whenever import account is being opened.
   */
  onOpenImportAccount?: () => void;
  /**
   * Optional callback that is called whenever connect hardware wallet is being opened.
   */
  onOpenConnectHardwareWallet?: () => void;
  /**
   * Optional callback fired on EVERY account tap inside the picker — even when
   * the user re-taps the already-selected account (in which case no Redux state
   * change occurs). Useful for callers that need to distinguish "user committed
   * a selection" from "user dismissed the picker without selecting" without
   * relying on Redux state diffs.
   */
  onSelectAccount?: (accountGroup: AccountGroupObject) => void;
  /**
   * Optional boolean that indicates if the account selector is for selection only. Other account actions are disabled when this is true.
   */
  isSelectOnly?: boolean;
  /**
   * Optional boolean to indicate if privacy mode is disabled.
   */
  disablePrivacyMode?: boolean;
  /**
   * Optional navigation screen to open add-account actions when the account selector loads.
   */
  navigateToAddAccountActions?: AccountSelectorScreens.MultichainAddWalletActions;
  /**
   * Only show EVM accounts.
   */
  isEvmOnly?: boolean;
  /**
   * Optional boolean to hide the add account button.
   */
  disableAddAccountButton?: boolean;
}

/**
 * AccountSelectorProps props.
 */
export interface AccountSelectorProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params?: AccountSelectorParams;
  };
}
