export const isNotificationsFeatureEnabled = () =>
  process.env.MM_NOTIFICATIONS_UI_ENABLED === 'true';

export enum ModalFieldType {
  ASSET = 'ModalField-Asset',
  ADDRESS = 'ModalField-Address',
  ANNOUNCEMENT_DESCRIPTION = 'ModalField-AnnouncementDescription',
  TRANSACTION = 'ModalField-Transaction',
  STAKING_PROVIDER = 'ModalField-StakingProvider',
  NETWORK_FEE = 'ModalField-NetworkFee',
  NETWORK = 'ModalField-Network',
  NFT_IMAGE = 'ModalField-NFTImage',
  NFT_COLLECTION_IMAGE = 'ModalField-NFTCollectionImage',
  SWAP_RATE = 'ModalField-SwapsRate',
}

export enum ModalFooterType {
  BLOCK_EXPLORER = 'ModalFooter-BlockExplorer',
  ANNOUNCEMENT_CTA = 'ModalFooter-AnnouncementCta',
}

export enum ModalHeaderType {
  NFT_IMAGE = 'ModalHeader-NFTImage',
  ANNOUNCEMENT_IMAGE = 'ModalHeader-AnnouncementImage',
}
