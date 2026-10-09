import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
import { ModalFieldType, ModalFooterType } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import {
  createTemplateMenuItem,
  NotificationState,
} from '../types/NotificationState';
import { getNetworkImageByChainId } from '../../methods/common';
import { getTokenAmount } from '../token-amounts';

type LidoWithdrawalRequestedNotification =
  ExtractedNotification<TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED>;

const isLidoWithdrawalRequestedNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED,
]);

const state: NotificationState<LidoWithdrawalRequestedNotification> = {
  guardFn: [
    isLidoWithdrawalRequestedNotification,
    (notification) => !!notification.payload.chain_id,
  ],
  createMenuItem: (notification) =>
    createTemplateMenuItem(
      notification,
      notification.payload.data.stake_in.image,
    ),
  createModalDetails: (notification) => {
    const networkLogo = getNetworkImageByChainId(notification.payload.chain_id);

    return {
      title: notification.template?.title ?? '',
      createdAt: notification.createdAt.toString(),
      fields: [
        {
          type: ModalFieldType.ADDRESS,
          label: strings('notifications.modal.label_account'),
          address: notification.payload.address,
        },
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_unstaking_requested'),
          description: notification.payload.data.stake_in.symbol,
          amount: getTokenAmount(notification.payload.data.stake_in),
          usdAmount: getTokenAmount(notification.payload.data.stake_in),
          tokenIconUrl: notification.payload.data.stake_in.image,
          tokenNetworkUrl: networkLogo,
        },
        {
          type: ModalFieldType.TRANSACTION,
          txHash: notification.payload.tx_hash,
        },
        {
          type: ModalFieldType.STAKING_PROVIDER,
          stakingProvider: 'Lido-staked ETH',
          tokenIconUrl: notification.payload.data.stake_in.image,
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
