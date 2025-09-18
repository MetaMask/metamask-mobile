import { ImageSourcePropType } from 'react-native';
import { NotificationServicesController } from '@metamask/notification-services-controller';
import { getNetworkFees } from '../../methods/common';
import {
  ModalFieldType,
  ModalFooterType,
  ModalHeaderType,
} from '../../constants';

type FeatureAnnouncementRawNotification =
  NotificationServicesController.Types.FeatureAnnouncementRawNotification;

// The Notification Modal is highly customizable.
// It contains any number of "Fields", as well as a footer for an action/link
// These fields are all unique, any new field will correspond to a unique UI field.
// (gives us future composition for new fields)

export interface ModalFieldAddress {
  type: ModalFieldType.ADDRESS;

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
  type: ModalFieldType.TRANSACTION;

  /**
   * Hash of the transaction
   */
  txHash: string;
}

export interface ModalFieldNetwork {
  type: ModalFieldType.NETWORK;

  /**
   * Network icon
   */
  iconUrl?: string | ImageSourcePropType;

  /**
   * Name of the network. E.g. Ethereum
   */
  name?: string;
}

export interface ModalFieldAsset {
  type: ModalFieldType.ASSET;

  /**
   * Url for the token icon
   */
  tokenIconUrl?: string | ImageSourcePropType;

  /**
   * Token network badge url.
   */
  tokenNetworkUrl?: string | ImageSourcePropType;

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
  type: ModalFieldType.NFT_COLLECTION_IMAGE;

  /**
   * NFT Collection Image
   */
  collectionImageUrl: string;

  /**
   * Network Badge. E.g. url for Ethereum.
   */
  networkBadgeUrl?: string | ImageSourcePropType;

  /**
   * Collection Name. E.g. "Pixel Birds (#211)"
   */
  collectionName: string;
}

export interface ModalFieldStakingProvider {
  // This is unique, it is similar to a Transaction UI
  type: ModalFieldType.STAKING_PROVIDER;

  /**
   * Url for the token icon
   */
  tokenIconUrl: string;

  /**
   * Staking Provider. E.g. Lido-staked ETH, or RocketPool
   */
  stakingProvider: string;
}

export interface ModalFieldSwapsRate {
  type: ModalFieldType.SWAP_RATE;

  /**
   * We can compute the rate when creating this details state
   */
  rate: string;
}

export interface ModalFieldNetworkFee {
  type: ModalFieldType.NETWORK_FEE;

  getNetworkFees: () => ReturnType<typeof getNetworkFees>;
}

export interface ModalFieldAnnouncementDescription {
  type: ModalFieldType.ANNOUNCEMENT_DESCRIPTION;

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
  type: ModalHeaderType.NFT_IMAGE;

  /**
   * NFT Image
   */
  nftImageUrl: string;

  /**
   * Network Badge. E.g. url for Ethereum.
   */
  networkBadgeUrl?: string | ImageSourcePropType;
}

export interface ModalHeaderAnnouncementImage {
  type: ModalHeaderType.ANNOUNCEMENT_IMAGE;

  /**
   * Announcement Image Url
   */
  imageUrl: string;
}

export type ModalHeader = ModalHeaderNFTImage | ModalHeaderAnnouncementImage;

export interface ModalFooterBlockExplorer {
  type: ModalFooterType.BLOCK_EXPLORER;

  /**
   * ChainId so we can fetch the correct network
   */
  chainId: number;

  /**
   * Transaction Hash to forward the correct block explorer page
   */
  txHash: string;
}

export interface ModalFooterAnnouncementCta {
  type: ModalFooterType.ANNOUNCEMENT_CTA;
  mobileLink?: FeatureAnnouncementRawNotification['data']['mobileLink'];
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
