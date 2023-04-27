export interface Network {
  chainId: string;
  nickname: string;
  rpcPrefs: {
    blockExplorerUrl: string;
    imageUrl: string;
  };
  rpcUrl: string;
  ticker: string;
  /**
   * Not supported by Infura
   */
  warning?: boolean;
}

export interface CustomNetworkProps extends Network {
  /**
   * is network modal open
   */
  isNetworkModalVisible: boolean;
  /**
   * Close or hide network modal
   */
  closeNetworkModal: () => void;
  /**
   * network to add or switch to
   */
  selectedNetwork: Network;
  /**
   * show or hide warning modal
   */
  toggleWarningModal: () => void;
  /**
   * show network modal
   */
  showNetworkModal: () => void;
  /**
   * Switch tab between popular and custom networks
   */
  switchTab: (goToPage: number) => void;
  /**
   * should navigation return to wallet after network change
   */
  shouldNetworkSwitchPopToWallet: boolean;
}
