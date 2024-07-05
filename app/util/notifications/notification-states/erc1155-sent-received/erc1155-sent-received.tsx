import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  getNativeTokenDetailsByChainId,
  getNetworkFees,
  getNotificationBadge,
  shortenAddress,
} from '../../notification.util';

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
  const address = shortenAddress(isSent(n) ? n.data.to : n.data.from);
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
      start: notification.data.nft?.collection.name || '',
      end:
        notification.data.nft?.token_id && `#${notification.data.nft.token_id}`,
    },

    image: {
      url: notification.data.nft?.image,
      variant: 'square',
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt,
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.chain_id,
    );
    return {
      title: modalTitle(notification),
      createdAt: notification.createdAt,
      header: {
        type: 'ModalHeader-NFTImage',
        nftImageUrl: notification.data.nft?.image ?? '',
        networkBadgeUrl: nativeTokenDetails?.image,
      },
      fields: [
        {
          type: 'ModalField-Address',
          label: isSent(notification)
            ? strings('notifications.modal.label_address_to_you')
            : strings('notifications.modal.label_address_to'),
          address: notification.data.to,
        },
        {
          type: 'ModalField-Address',
          label: isSent(notification)
            ? strings('notifications.modal.label_address_from')
            : strings('notifications.modal.label_address_from_you'),
          address: notification.data.from,
        },
        {
          type: 'ModalField-Transaction',
          txHash: notification.tx_hash,
        },
        ...(notification.data.nft?.collection
          ? ([
              {
                type: 'ModalField-NFTCollectionImage',
                collectionName: notification.data.nft.collection.name,
                collectionImageUrl: notification.data.nft.collection.image,
                networkBadgeUrl: nativeTokenDetails?.image,
              },
            ] as const)
          : []),
        {
          type: 'ModalField-Network',
          iconUrl: nativeTokenDetails?.image,
          name: nativeTokenDetails?.name,
        },
        {
          type: 'ModalField-NetworkFee',
          getNetworkFees: () => getNetworkFees(notification),
        },
      ],
      footer: {
        type: 'ModalFooter-BlockExplorer',
        chainId: notification.chain_id,
        txHash: notification.tx_hash,
      },
    };
  },
};

export default state;
