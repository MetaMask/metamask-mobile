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
import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectBridgeHistoryForAccount } from '../../../../../../selectors/bridgeStatusController';
import { hasTransactionType } from '../../../utils/transaction';
import { Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { TransactionDetailsStatus } from '../transaction-details-status';

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
          <TransactionSummary
            key={index}
            transaction={item}
            isLast={index === transactions.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
}

function TransactionSummary({
  isLast,
  transaction,
}: {
  isLast: boolean;
  transaction: TransactionMeta;
}) {
  const bridgeHistory = useBridgeTxHistoryData({ evmTxMeta: transaction });
  const allBridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const approvalBridgeHistory = Object.values(allBridgeHistory).find(
    (h) => h.approvalTxId === transaction.id,
  );

  const { chainId: chainIdHex, hash: txHash } = transaction;
  const time = transaction.submittedTime ?? transaction.time;

  const receiveTime =
    bridgeHistory?.bridgeTxHistoryItem?.completionTime ?? time;

  const receiveChainIdNumber =
    bridgeHistory?.bridgeTxHistoryItem?.quote?.destChainId;

  const receiveChainId = receiveChainIdNumber
    ? toHex(receiveChainIdNumber)
    : undefined;

  const receiveHash =
    bridgeHistory?.bridgeTxHistoryItem?.status?.destChain?.txHash;

  const sourceChainName = useNetworkName(chainIdHex);
  const targetChainName = useNetworkName(receiveChainId);

  const title = getLineTitle(
    transaction,
    bridgeHistory.bridgeTxHistoryItem,
    approvalBridgeHistory,
    sourceChainName,
  );

  const receiveTitle =
    getLineTitle(
      transaction,
      bridgeHistory.bridgeTxHistoryItem,
      approvalBridgeHistory,
      targetChainName,
      true,
    ) ?? '';

  if (!title) {
    return null;
  }

  return (
    <>
      <SummaryLine
        chainId={chainIdHex}
        isLast={isLast}
        time={time}
        title={title}
        transaction={transaction}
        transactionHash={txHash}
      />
      {receiveChainId && (
        <SummaryLine
          chainId={receiveChainId}
          isBridgeReceive
          isLast={isLast}
          time={receiveTime}
          title={receiveTitle}
          transaction={transaction}
          transactionHash={receiveHash}
        />
      )}
    </>
  );
}

function SummaryLine({
  chainId,
  isBridgeReceive,
  isLast,
  time,
  title,
  transaction,
  transactionHash,
}: {
  chainId: Hex;
  isBridgeReceive?: boolean;
  isLast: boolean;
  time: number;
  title: string;
  transaction: TransactionMeta;
  transactionHash: string | undefined;
}) {
  const { styles } = useStyles(styleSheet, { isLast });
  const navigation = useNavigation();
  const chainIdNumber = parseInt(chainId, 16);

  const { explorerTxUrl, explorerName } =
    useMultichainBlockExplorerTxUrl({
      chainId: chainIdNumber,
      txHash: transactionHash,
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

  const dateString = getDateString(time);

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
        <TransactionDetailsStatus
          transactionMeta={transaction}
          isBridgeReceive={isBridgeReceive}
          text={title}
          gap={12}
        />
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
  bridgeHistory: BridgeHistoryItem | undefined,
  approvalBridgeHistory: BridgeHistoryItem | undefined,
  networkName: string | undefined,
  isReceive = false,
): string | undefined {
  const { type } = transactionMeta;
  const sourceSymbol = bridgeHistory?.quote?.srcAsset?.symbol;
  const targetSymbol = bridgeHistory?.quote?.destAsset?.symbol;
  const approveSymbol = approvalBridgeHistory?.quote?.srcAsset?.symbol;

  if (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit])) {
    return strings('transaction_details.summary_title.perps_deposit');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return strings('transaction_details.summary_title.predict_deposit');
  }

  if (isReceive && type === TransactionType.bridge) {
    return targetSymbol && networkName
      ? strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol,
          targetChain: networkName,
        })
      : strings('transaction_details.summary_title.bridge_receive_loading');
  }

  switch (type) {
    case TransactionType.bridge:
      return sourceSymbol && networkName
        ? strings('transaction_details.summary_title.bridge_send', {
            sourceSymbol,
            sourceChain: networkName,
          })
        : strings('transaction_details.summary_title.bridge_send_loading');
    case TransactionType.bridgeApproval:
      return approveSymbol
        ? strings('transaction_details.summary_title.bridge_approval', {
            approveSymbol,
          })
        : strings('transaction_details.summary_title.bridge_approval_loading');
    case TransactionType.swap:
      return strings('transaction_details.summary_title.swap');
    case TransactionType.swapApproval:
      return strings('transaction_details.summary_title.swap_approval');
    default:
      return strings('transaction_details.summary_title.default');
  }
}
