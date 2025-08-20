import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './transaction-details-summary.styles';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import { selectTransactionsByIds } from '../../../../../../selectors/transactionController';
import { useSelector } from 'react-redux';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { RootState } from '../../../../../../reducers';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';

export function TransactionDetailsSummary() {
  const { styles } = useStyles(styleSheet, {});
  const { transactionMeta } = useTransactionDetails();
  const { requiredTransactionIds } = transactionMeta;

  const transactionIds = [
    ...(requiredTransactionIds ?? []),
    transactionMeta.id,
  ];

  const transactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, transactionIds),
  );

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>Summary</Text>
      <Box gap={1} style={styles.lineContainer}>
        {transactions.map((item, index) => (
          <SummaryLine
            key={index}
            transaction={item}
            isLast={index === transactions.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
}

function SummaryLine({
  isLast,
  transaction,
}: {
  isLast: boolean;
  transaction: TransactionMeta;
}) {
  const { styles } = useStyles(styleSheet, { isLast });
  const bridgeHistory = useBridgeTxHistoryData({ evmTxMeta: transaction });

  const dateString = getDateString(
    transaction.submittedTime ?? transaction.time,
  );

  const title = getLineTitle(transaction, bridgeHistory.bridgeTxHistoryItem);

  if (!title) {
    return null;
  }

  return (
    <Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
      >
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={12}
        >
          <Icon name={IconName.CircleX} />
          <Text variant={TextVariant.BodyMD}>{title}</Text>
        </Box>
        <Icon name={IconName.Arrow2UpRight} color={IconColor.Alternative} />
      </Box>
      <Box flexDirection={FlexDirection.Row}>
        <Box style={styles.divider} />
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.secondary}
        >
          {dateString}
        </Text>
      </Box>
    </Box>
  );
}

function getDateString(timestamp: number): string {
  const date = new Date(timestamp);

  const timeString = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);

  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);

  const dateString = `${month} ${date.getDate()}, ${date.getFullYear()}`;

  return `${timeString} • ${dateString}`;
}

function getLineTitle(
  transactionMeta: TransactionMeta,
  bridgeHistory?: BridgeHistoryItem,
): string | undefined {
  const { type } = transactionMeta;
  const sourceSymbol = bridgeHistory?.quote.srcAsset.symbol;
  const targetSymbol = bridgeHistory?.quote.destAsset.symbol;

  switch (type) {
    case TransactionType.bridge:
      return strings('transaction_details.summary_title.bridge', {
        sourceSymbol,
        targetSymbol,
      });
    case TransactionType.perpsDeposit:
      return strings('transaction_details.summary_title.perps_deposit');
    default:
      return undefined;
  }
}
