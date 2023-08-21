import { TabBarProps } from 'react-native-scrollable-tab-view';

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
  showNetworkModal: (network: Network) => void;
  /**
   * Switch tab between popular and custom networks
   */
  // TODO - The name for this type is not accurate. It should be a ref of the ScrollableTabView's tab.
  switchTab: TabBarProps;
  /**
   * should navigation return to wallet after network change
   */
  shouldNetworkSwitchPopToWallet: boolean;
}
