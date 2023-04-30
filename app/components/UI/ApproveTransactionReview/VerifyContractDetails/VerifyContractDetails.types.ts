export interface VerifyContractDetailsProps {
  /**
   * contract address
   */
  contractAddress: string;
  closeVerifyContractView: () => void;
  tokenAddress: string;
  savedContactListToArray: any[];
  /**
   * copy contract address
   */
  copyAddress: (address: string) => void;
  /**
   * toggle block explorer view
   */
  toggleBlockExplorer: (address: string) => void;
  /**
   * toggle nickname view
   */
  showNickname: (address: string) => void;
  tokenStandard: string;
  tokenSymbol: string;
  providerType: string;
  providerRpcTarget: string;
  frequentRpcList: any[];
}
