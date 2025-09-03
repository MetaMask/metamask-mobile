export interface ModalsState {
  networkModalVisible: boolean;
  shouldNetworkSwitchPopToWallet: boolean;
  collectibleContractModalVisible: boolean;
  dappTransactionModalVisible: boolean;
  signMessageModalVisible: boolean;
  infoNetworkModalVisible?: boolean;
  slowRpcConnectionModalVisible: boolean;
  slowRpcConnectionState: {
    type: 'degraded' | 'unavailable';
    chainId?: string;
    rpcUrl?: string;
    error?: string;
  } | null;
  slowRpcConnectionBannerVisible: boolean;
}
