/**
 * AccountSelectorProps props.
 */
export interface AccountSelectorProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params?: {
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
       * Optional callback that is called whenever an account is selected.
       */
      onSelectAccount?: (address: string) => void;
      /**
       * Optional boolean that indicates if the sheet is for selection only. Other account actions are disabled when this is true.
       */
      isSelectOnly?: boolean;
    };
  };
}
