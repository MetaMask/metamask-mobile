const getEnvStr = (test: string, prod: string, override?: string) =>
  override ?? (process.env.NODE_ENV !== 'production' ? test : prod);

export const NOTIFICATION_AUTH_URL = getEnvStr(
  'https://authentication.uat-api.cx.metamask.io',
  'https://authentication.api.cx.metamask.io',
  process.env.NOTIFICATION_AUTH_URL,
);
export const USER_STORAGE_SERVICE_URL = getEnvStr(
  'https://user-storage.uat-api.cx.metamask.io',
  'https://user-storage.api.cx.metamask.io',
  process.env.USER_STORAGE_SERVICE_URL,
);
export const TRIGGERS_SERVICE_URL = getEnvStr(
  'https://trigger.uat-api.cx.metamask.io',
  'https://trigger.api.cx.metamask.io',
  process.env.TRIGGERS_SERVICE_URL,
);
export const NOTIFICATIONS_SERVICE_URL = getEnvStr(
  'https://notification.uat-api.cx.metamask.io',
  'https://notification.api.cx.metamask.io',
  process.env.NOTIFICATIONS_SERVICE_URL,
);

export const PUSH_NOTIFICATIONS_SERVICE_URL = getEnvStr(
  'https://push.uat-api.cx.metamask.io',
  'https://push.api.cx.metamask.io',
  process.env.PUSH_NOTIFICATIONS_SERVICE_URL,
);

export const VAPID_KEY = process.env.FCM_VAPID_KEY ?? '';

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
  NFT_IMAGE = 'ModalField-NFTCollectionImage',
  NFT_COLLECTION_IMAGE = 'ModalField-NFTImage',
  BLOCK_EXPLORER = 'ModalField-BlockExplorer',
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
