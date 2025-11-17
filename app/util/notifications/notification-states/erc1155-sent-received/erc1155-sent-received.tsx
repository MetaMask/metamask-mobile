import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
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
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
} from '../../methods/common';
import { ModalField } from '../types/NotificationModalDetails';
import { formatAddress } from '../../../address';

type ERC1155Notification = ExtractedNotification<
  TRIGGER_TYPES.ERC1155_RECEIVED | TRIGGER_TYPES.ERC1155_SENT
>;
const isERC1155Notification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ERC1155_RECEIVED,
  TRIGGER_TYPES.ERC1155_SENT,
]);

const isSent = (n: ERC1155Notification) =>
  n.type === TRIGGER_TYPES.ERC1155_SENT;

const title = (n: ERC1155Notification) => {
  const address = formatAddress(
    isSent(n) ? n.payload.data.to : n.payload.data.from,
    'short',
  );
  return strings(`notifications.menu_item_title.${n.type}`, {
    address,
  });
};

const modalTitle = (n: ERC1155Notification) =>
  isSent(n)
    ? strings('notifications.modal.title_sent', { symbol: 'NFT' })
    : strings('notifications.modal.title_received', {
        symbol: 'NFT',
      });

const state: NotificationState<ERC1155Notification> = {
  guardFn: isERC1155Notification,
  createMenuItem: (notification) => ({
    title: title(notification),

    description: {
      start: notification.payload.data.nft?.collection.name || '',
      end:
        notification.payload.data.nft?.token_id &&
        `#${notification.payload.data.nft.token_id}`,
    },

    image: {
      url: notification.payload.data.nft?.image,
      variant: 'square',
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt.toString(),
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.payload.chain_id,
    );

    const collectionField: ModalField[] = notification.payload.data.nft
      ?.collection
      ? [
          {
            type: ModalFieldType.NFT_COLLECTION_IMAGE,
            collectionName: notification.payload.data.nft.collection.name,
            collectionImageUrl: notification.payload.data.nft.collection.image,
            networkBadgeUrl: nativeTokenDetails?.image,
          },
        ]
      : [];
    return {
      title: modalTitle(notification),
      createdAt: notification.createdAt.toString(),
      header: {
        type: ModalHeaderType.NFT_IMAGE,
        nftImageUrl: notification.payload.data.nft?.image ?? '',
        networkBadgeUrl: nativeTokenDetails?.image,
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
        ...collectionField,
        {
          type: ModalFieldType.NETWORK,
          iconUrl: nativeTokenDetails?.image,
          name: nativeTokenDetails?.name,
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
