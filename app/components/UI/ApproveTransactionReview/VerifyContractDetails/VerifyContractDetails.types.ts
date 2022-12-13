export interface VerifyContractDetailsProps {
  /**
   * saved contract nickname
   */
  contractName?: string;
  /**
   * toggle verify contract details view
   */
  toggleVerifyContractView: () => void;
  /**
   * contract address
   */
  contractAddress: string;
  /**
   * copy contract address
   */
  copyAddress: () => void;
  /**
   * toggle block explorer view
   */
  toggleBlockExplorerView: () => void;
  /**
   * toggle nickname view
   */
  toggleNicknameView: () => void;
}
