import { getNetworkFees } from '../../notification.util';

// The Notification Modal is highly customizable.
// It contains any number of "Fields", as well as a footer for an action/link
// These fields are all unique, any new field will correspond to a unique UI field.
// (gives us future composition for new fields)

export interface ModalFieldAddress {
  type: 'ModalField-Address';

  /**
   * Label for the address field. E.g.: "From", "To", "Account", "From (You)", "To (You)"
   */
  label: string;

  /**
   * Address of the account
   */
  address: string;
}

export interface ModalFieldTransaction {
  type: 'ModalField-Transaction';

  /**
   * Hash of the transaction
   */
  txHash: string;
}

export interface ModalFieldNetwork {
  type: 'ModalField-Network';

  /**
   * Network icon
   */
  iconUrl: string;

  /**
   * Name of the network. E.g. Ethereum
   */
  name: string;
}

export interface ModalFieldAsset {
  type: 'ModalField-Asset';

  /**
   * Url for the token icon
   */
  tokenIconUrl: string;

  /**
   * Token network badge url.
   */
  tokenNetworkUrl: string;

  /**
   * Label for this field. E.g.: "Asset", "Swapped", "To", "Staked", "Received"
   */
  label: string;

  /**
   * Token Symbol. E.g. Eth, DAI, USDC
   */
  symbol: string;

  /**
   * Token Amount. E.g. 100 USDC
   */
  amount: string;

  /**
   * USD Amount. E.g. $100.54
   */
  usdAmount: string;
}

export interface ModalFieldNFTHeadingImage {
  type: 'ModalField-NFTHeadingImage';

  /**
   * NFT Image
   */
  nftImageUrl: string;

  /**
   * Network Badge. E.g. url for Ethereum.
   */
  networkBadgeUrl: string;
}

export interface ModalFieldNFTCollectionImage {
  type: 'ModalField-NFTCollectionImage';

  /**
   * NFT Collection Image
   */
  collectionImageUrl: string;

  /**
   * Network Badge. E.g. url for Ethereum.
   */
  networkBadgeUrl: string;
}

export interface ModalFieldStakingProvider {
  // This is unique, it is similar to a Transaction UI
  type: 'ModalField-StakingProvider';

  /**
   * Url for the token icon
   */
  tokenIconUrl: string;

  /**
   * Request ID copy.
   */
  requestId: string;
}

export interface ModalFieldSwapsRate {
  type: 'ModalField-SwapsRate';

  /**
   * We can compute the rate when creating this details state
   */
  rate: string;
}

export interface ModalFieldNetworkFee {
  type: 'ModalField-NetworkFee';

  getNetworkFees: () => ReturnType<typeof getNetworkFees>;
}

export type ModalField =
  | ModalFieldAddress
  | ModalFieldTransaction
  | ModalFieldNetwork
  | ModalFieldAsset
  | ModalFieldNFTHeadingImage
  | ModalFieldNFTCollectionImage
  | ModalFieldStakingProvider
  | ModalFieldSwapsRate
  | ModalFieldNetworkFee;

export interface ModalFooterBlockExplorer {
  type: 'ModalFooter-BlockExplorer';

  chainId: number;
}

export type ModalFooter = ModalFooterBlockExplorer;

export interface NotificationModalDetails {
  /**
   * Modal Title.
   */
  title: string;

  /**
   * Timestamp of the notification
   * This is meant to be a stringified date
   */
  createdAt: string;

  /**
   * Composable list of fields.
   */
  fields: ModalField[];

  footer: ModalFooter;
}
