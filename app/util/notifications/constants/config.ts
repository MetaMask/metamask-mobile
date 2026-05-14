import Engine from '../../../core/Engine';
import { isE2E } from '../../test/utils';

/**
 * This feature flag compromises of a build-time flag as well as a remote flag.
 * NOTE: this does not use the remote flag redux selectors, so UI is prone to being stale.
 * - This is okay in our case as we make this function call on all notification actions.
 *
 * @returns boolean if notifications feature is enabled.
 */
export const isNotificationsFeatureEnabled = () => {
  if (isE2E) {
    return true;
  }

  const notificationsRemoteFlagEnabled = Boolean(
    Engine?.context?.RemoteFeatureFlagController?.state?.remoteFeatureFlags
      ?.assetsNotificationsEnabled,
  );

  return (
    process.env.MM_NOTIFICATIONS_UI_ENABLED === 'true' &&
    notificationsRemoteFlagEnabled
  );
};

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
