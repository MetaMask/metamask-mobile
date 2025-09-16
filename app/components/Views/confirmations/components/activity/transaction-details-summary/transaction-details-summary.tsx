import React, { useCallback } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './transaction-details-summary.styles';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import {
  selectTransactionsByBatchId,
  selectTransactionsByIds,
} from '../../../../../../selectors/transactionController';
import { useSelector } from 'react-redux';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { RootState } from '../../../../../../reducers';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useBridgeTxHistoryData } from '../../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { TransactionDetailsStatusIcon } from '../transaction-details-status-icon';
import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';

export function TransactionDetailsSummary() {
  const { styles } = useStyles(styleSheet, {});
  const { transactionMeta } = useTransactionDetails();
  const {
    batchId,
    id: transactionId,
    requiredTransactionIds,
  } = transactionMeta;

  const batchTransactions = useSelector((state: RootState) =>
    selectTransactionsByBatchId(state, batchId ?? ''),
  );

  const batchTransactionIds = batchTransactions
    .filter((t) => t.id !== transactionId)
    .map((t) => t.id);

  const transactionIds = [
    ...(requiredTransactionIds ?? []),
    ...(batchTransactionIds ?? []),
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
  const navigation = useNavigation();
  const allBridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const approvalBridgeHistory = Object.values(allBridgeHistory).find(
    (h) => h.approvalTxId === transaction.id,
  );

  const { chainId: chainIdHex, hash: txHash } = transaction;
  const chainId = parseInt(chainIdHex, 16);

  const { explorerTxUrl, explorerName } =
    useMultichainBlockExplorerTxUrl({
      chainId,
      txHash,
    }) ?? {};

  const handleExplorerClick = useCallback(() => {
    if (!explorerTxUrl) {
      return;
    }

    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: explorerTxUrl, title: explorerName },
    });
  }, [explorerName, explorerTxUrl, navigation]);

  const dateString = getDateString(
    transaction.submittedTime ?? transaction.time,
  );

  const title = getLineTitle(
    transaction,
    bridgeHistory.bridgeTxHistoryItem,
    approvalBridgeHistory,
  );

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
          <TransactionDetailsStatusIcon transactionMeta={transaction} />
          <Text variant={TextVariant.BodyMD}>{title}</Text>
        </Box>
        {explorerTxUrl && (
          <ButtonIcon
            testID="block-explorer-button"
            iconName={IconName.Export}
            onPress={handleExplorerClick}
          />
        )}
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
  approvalBridgeHistory?: BridgeHistoryItem,
): string | undefined {
  const { type } = transactionMeta;
  const sourceSymbol = bridgeHistory?.quote.srcAsset.symbol;
  const targetSymbol = bridgeHistory?.quote.destAsset.symbol;
  const approveSymbol = approvalBridgeHistory?.quote.srcAsset.symbol;

  switch (type) {
    case TransactionType.bridge:
      return strings('transaction_details.summary_title.bridge', {
        sourceSymbol,
        targetSymbol,
      });
    case TransactionType.bridgeApproval:
      return strings('transaction_details.summary_title.bridge_approval', {
        approveSymbol,
      });
    case TransactionType.perpsDeposit:
      return strings('transaction_details.summary_title.perps_deposit');
    case TransactionType.swap:
      return strings('transaction_details.summary_title.swap');
    case TransactionType.swapApproval:
      return strings('transaction_details.summary_title.swap_approval');
    default:
      return strings('transaction_details.summary_title.default');
  }
}
