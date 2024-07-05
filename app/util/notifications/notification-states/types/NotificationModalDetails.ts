import { getNetworkFees } from '../../notification.util';
import { FeatureAnnouncementRawNotification } from '../../types/featureAnnouncement';

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
   * This is below the label.
   * It can be token name (e.g. Compound), asset (COMP, DAI), or anything else
   */
  description: string;

  /**
   * Token Amount. E.g. "100 USDC" (includes asset)
   */
  amount: string;

  /**
   * USD Amount. E.g. $100.54
   */
  usdAmount: string;
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

  /**
   * Collection Name. E.g. "Pixel Birds (#211)"
   */
  collectionName: string;
}

export interface ModalFieldStakingProvider {
  // This is unique, it is similar to a Transaction UI
  type: 'ModalField-StakingProvider';

  /**
   * Url for the token icon
   */
  tokenIconUrl: string;

  /**
   * Staking Provider. E.g. Lido-staked ETH, or RocketPool
   */
  stakingProvider: string;

  /**
   * Request ID copy.
   */
  requestId?: string;
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

export interface ModalFieldAnnouncementDescription {
  type: 'ModalField-AnnouncementDescription';

  /**
   * This is a stringified HTML document, to be used or translated into React/React Native
   */
  description: FeatureAnnouncementRawNotification['data']['longDescription'];
}

export type ModalField =
  | ModalFieldAddress
  | ModalFieldTransaction
  | ModalFieldNetwork
  | ModalFieldAsset
  | ModalFieldNFTCollectionImage
  | ModalFieldStakingProvider
  | ModalFieldSwapsRate
  | ModalFieldNetworkFee
  | ModalFieldAnnouncementDescription;

export interface ModalHeaderNFTImage {
  type: 'ModalHeader-NFTImage';

  /**
   * NFT Image
   */
  nftImageUrl: string;

  /**
   * Network Badge. E.g. url for Ethereum.
   */
  networkBadgeUrl: string;
}

export interface ModalHeaderAnnouncementImage {
  type: 'ModalHeader-AnnouncementImage';

  /**
   * Announcement Image Url
   */
  imageUrl: string;
}

export type ModalHeader = ModalHeaderNFTImage | ModalHeaderAnnouncementImage;

export interface ModalFooterBlockExplorer {
  type: 'ModalFooter-BlockExplorer';

  chainId: number;
}

export interface ModalFooterAnnouncementCta {
  type: 'ModalFooter-AnnouncementCta';

  // We currently to not support a mobile link
  mobileLink?: FeatureAnnouncementRawNotification['data']['extensionLink'];
}

export type ModalFooter = ModalFooterBlockExplorer | ModalFooterAnnouncementCta;

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
   * Optional Headers for some notifications
   */
  header?: ModalHeader;

  /**
   * Composable list of fields.
   */
  fields: ModalField[];

  /**
   * Optional Footer (e.g. block explorer link)
   */
  footer?: ModalFooter;
}
