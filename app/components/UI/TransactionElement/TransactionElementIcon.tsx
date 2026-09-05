import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { TRANSACTION_TYPES } from '../../../util/transactions';
import { hasTransactionType } from '../../Views/confirmations/utils/transaction';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import type { TransactionWithImportTime } from '../Transactions/AssetDetailsActivityListItem.utils';
import type { TransactionElementStyles } from './styles';
import type { DecodedTransactionElement } from './types';
import transactionIconApprove from '../../../images/transaction-icons/approve.png';
import transactionIconInteraction from '../../../images/transaction-icons/interaction.png';
import transactionIconSent from '../../../images/transaction-icons/send.png';
import transactionIconReceived from '../../../images/transaction-icons/receive.png';
import transactionIconSwap from '../../../images/transaction-icons/swap.png';
import transactionIconApproveFailed from '../../../images/transaction-icons/approve-failed.png';
import transactionIconInteractionFailed from '../../../images/transaction-icons/interaction-failed.png';
import transactionIconSentFailed from '../../../images/transaction-icons/send-failed.png';
import transactionIconReceivedFailed from '../../../images/transaction-icons/receive-failed.png';
import transactionIconSwapFailed from '../../../images/transaction-icons/swap-failed.png';

interface TransactionElementIconProps {
  transactionElement: DecodedTransactionElement;
  tx: TransactionWithImportTime;
  transactions: TransactionMeta[];
  styles: TransactionElementStyles;
}

const TransactionElementIcon = ({
  transactionElement,
  tx,
  transactions,
  styles,
}: TransactionElementIconProps) => {
  const { chainId: txChainId, requiredTransactionIds, status, type } = tx;
  const { transactionType } = transactionElement;
  const isFailedTransaction = status === 'cancelled' || status === 'failed';
  let icon: ImageSourcePropType | undefined;

  switch (transactionType) {
    case TRANSACTION_TYPES.SENT_TOKEN:
    case TRANSACTION_TYPES.SENT_COLLECTIBLE:
    case TRANSACTION_TYPES.SENT:
      icon = isFailedTransaction
        ? transactionIconSentFailed
        : transactionIconSent;
      break;
    case TRANSACTION_TYPES.RECEIVED_TOKEN:
    case TRANSACTION_TYPES.RECEIVED_COLLECTIBLE:
    case TRANSACTION_TYPES.RECEIVED:
      icon = isFailedTransaction
        ? transactionIconReceivedFailed
        : transactionIconReceived;
      break;
    case TRANSACTION_TYPES.SITE_INTERACTION:
      icon = isFailedTransaction
        ? transactionIconInteractionFailed
        : transactionIconInteraction;
      break;
    case TRANSACTION_TYPES.BATCH_SELL_TRANSACTION:
    case TRANSACTION_TYPES.SWAPS_TRANSACTION:
    case TRANSACTION_TYPES.BRIDGE_TRANSACTION:
      icon = isFailedTransaction
        ? transactionIconSwapFailed
        : transactionIconSwap;
      break;
    case TRANSACTION_TYPES.APPROVE:
    case TRANSACTION_TYPES.INCREASE_ALLOWANCE:
    case TRANSACTION_TYPES.SET_APPROVAL_FOR_ALL:
      icon = isFailedTransaction
        ? transactionIconApproveFailed
        : transactionIconApprove;
      break;
  }

  const perpsDepositChainId =
    type === TransactionType.perpsDeposit && requiredTransactionIds?.length
      ? transactions.find(
          (transaction) => transaction.id === requiredTransactionIds[0],
        )?.chainId
      : undefined;

  const withdrawChainId = hasTransactionType(tx, [
    TransactionType.predictWithdraw,
    TransactionType.perpsWithdraw,
  ])
    ? tx.metamaskPay?.chainId
    : undefined;

  const chainId = perpsDepositChainId ?? withdrawChainId ?? txChainId;

  return (
    <BadgeWrapper
      badgePosition={styles.iconBadgePosition}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          imageSource={NetworkBadgeSource(chainId)}
          isScaled={false}
          size={AvatarSize.Xs}
        />
      }
    >
      <Image source={icon} style={styles.icon} resizeMode="stretch" />
    </BadgeWrapper>
  );
};

export default TransactionElementIcon;
