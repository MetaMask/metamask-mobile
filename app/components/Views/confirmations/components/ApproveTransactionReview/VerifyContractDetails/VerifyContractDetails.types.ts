import type { NetworkState } from '@metamask/network-controller';

export interface VerifyContractDetailsProps {
  /**
   * contract address
   */
  contractAddress: string;
  closeVerifyContractView: () => void;
  tokenAddress: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  networkConfigurations: NetworkState['networkConfigurationsByChainId'];
}
