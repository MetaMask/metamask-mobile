import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import {
  ModalFieldType,
  ModalFooterType,
  ModalHeaderType,
} from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import {
  label_address_from,
  label_address_to,
  NotificationState,
} from '../types/NotificationState';
import {
  getNetworkDetailsFromNotifPayload,
  getNetworkImageByChainId,
  getNotificationBadge,
} from '../../methods/common';

type ERC721Notification = ExtractedNotification<
  TRIGGER_TYPES.ERC721_RECEIVED | TRIGGER_TYPES.ERC721_SENT
>;
const isERC721Notification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ERC721_RECEIVED,
  TRIGGER_TYPES.ERC721_SENT,
]);

const state: NotificationState<ERC721Notification> = {
  guardFn: [
    isERC721Notification,
    (notification) =>
      !!getNetworkDetailsFromNotifPayload(notification.payload.network),
  ],
  createMenuItem: (notification) => ({
    title: notification.template?.title ?? '',

    description: {
      start: notification.payload.data.nft.collection.name,
      end: `#${notification.payload.data.nft.token_id}`,
    },

    image: {
      url: notification.payload.data.nft.image,
      variant: 'square',
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt.toString(),
  }),
  createModalDetails: (notification) => {
    const networkLogo = getNetworkImageByChainId(notification.payload.chain_id);
    const { networkName } = getNetworkDetailsFromNotifPayload(
      notification.payload.network,
    );
    return {
      title: notification.template?.title ?? '',
      createdAt: notification.createdAt.toString(),
      header: {
        type: ModalHeaderType.NFT_IMAGE,
        nftImageUrl: notification.payload.data.nft.image,
        networkBadgeUrl: networkLogo,
      },
      fields: [
        {
          type: ModalFieldType.ADDRESS,
          label: label_address_from(notification),
          address: notification.payload.data.from,
        },
        {
          type: ModalFieldType.ADDRESS,
          label: label_address_to(notification),
          address: notification.payload.data.to,
        },
        {
          type: ModalFieldType.TRANSACTION,
          txHash: notification.payload.tx_hash,
        },
        {
          type: ModalFieldType.NFT_COLLECTION_IMAGE,
          collectionName: notification.payload.data.nft.collection.name,
          collectionImageUrl: notification.payload.data.nft.collection.image,
          networkBadgeUrl: networkLogo,
        },
        {
          type: ModalFieldType.NETWORK,
          iconUrl: networkLogo,
          name: networkName,
        },
      ],
      footer: {
        type: ModalFooterType.BLOCK_EXPLORER,
        chainId: notification.payload.chain_id,
        txHash: notification.payload.tx_hash,
      },
    };
  },
};

export default state;
