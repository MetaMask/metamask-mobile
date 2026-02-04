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
  CHAIN_IDS,
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
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { POLYGON_USDCE } from '../../../constants/predict';
import { MusdConversionSummary } from '../musd-conversion-details-summary';

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
    transactionId,
  ];

  const transactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, transactionIds),
  );

  // For mUSD conversion, always show exactly 2 lines (Sent + Receive)
  if (hasTransactionType(transactionMeta, [TransactionType.musdConversion])) {
    return <MusdConversionSummary transactionMeta={transactionMeta} />;
  }

  return (
    <Box gap={12}>
      {/* <Text color={TextColor.Alternative}>Summary</Text> */}
      <Box gap={1} style={styles.lineContainer}>
        {transactions.map((item, index) => (
          <TransactionSummary
            key={index}
            transaction={item}
            isLast={index === transactions.length - 1}
            parentTransaction={transactionMeta}
          />
        ))}
      </Box>
    </Box>
  );
}

function TransactionSummary({
  isLast,
  transaction,
  parentTransaction,
}: {
  isLast: boolean;
  transaction: TransactionMeta;
  parentTransaction: TransactionMeta;
}) {
  const {
    chainId: receiveChainId,
    hash: receiveHash,
    isReceiveOnly,
    sourceNetworkName,
    sourceSymbol,
    targetNetworkName,
    targetSymbol,
    time: receiveTime,
  } = useBridgeReceiveData(transaction, parentTransaction);

  const allBridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const approvalBridgeHistory = Object.values(allBridgeHistory).find(
    (h) => h.approvalTxId === transaction.id,
  );

  const { chainId: chainIdHex, hash: txHash } = transaction;
  const time = transaction.submittedTime ?? transaction.time;

  const title = getLineTitle({
    approvalBridgeHistory,
    networkName: sourceNetworkName,
    parentTransaction,
    symbol: sourceSymbol,
    transactionMeta: transaction,
  });

  const receiveTitle =
    getLineTitle({
      isReceive: true,
      networkName: targetNetworkName,
      symbol: targetSymbol,
      transactionMeta: transaction,
    }) ?? '';

  if (!title) {
    return null;
  }

  return (
    <>
      {!isReceiveOnly && (
        <SummaryLine
          chainId={chainIdHex}
          isLast={isLast}
          time={time}
          title={title}
          transaction={transaction}
          transactionHash={txHash}
        />
      )}
      {receiveChainId && (
        <SummaryLine
          chainId={receiveChainId}
          isBridgeReceive
          isLast={isLast}
          time={receiveTime ?? time}
          title={receiveTitle}
          transaction={transaction}
          transactionHash={receiveHash}
        />
      )}
    </>
  );
}

export function SummaryLine({
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

function getLineTitle({
  approvalBridgeHistory,
  isReceive,
  networkName,
  parentTransaction: _parentTransaction,
  symbol,
  transactionMeta,
}: {
  approvalBridgeHistory?: BridgeHistoryItem;
  isReceive?: boolean;
  networkName?: string;
  parentTransaction?: TransactionMeta;
  symbol?: string;
  transactionMeta: TransactionMeta;
}): string | undefined {
  const { type } = transactionMeta;
  const approveSymbol = approvalBridgeHistory?.quote?.srcAsset?.symbol;

  if (isReceive) {
    return symbol && networkName
      ? strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol: symbol,
          targetChain: networkName,
        })
      : strings('transaction_details.summary_title.bridge_receive_loading');
  }

  if (symbol && networkName) {
    return strings('transaction_details.summary_title.bridge_send', {
      sourceSymbol: symbol,
      sourceChain: networkName,
    });
  }

  switch (type) {
    case TransactionType.bridge:
      return symbol && networkName
        ? strings('transaction_details.summary_title.bridge_send', {
            sourceSymbol: symbol,
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

function useBridgeReceiveData(
  transaction: TransactionMeta,
  parentTransaction: TransactionMeta,
): {
  chainId?: Hex;
  hash?: Hex;
  isReceiveOnly?: boolean;
  sourceNetworkName?: string;
  sourceSymbol?: string;
  targetNetworkName?: string;
  targetSymbol?: string;
  time?: number;
} {
  const bridgeHistory = useBridgeTxHistoryData({ evmTxMeta: transaction });

  const item = bridgeHistory?.bridgeTxHistoryItem;
  const time = item?.completionTime;
  const chainIdNumber = item?.quote?.destChainId;
  const chainId = chainIdNumber ? toHex(chainIdNumber) : undefined;
  const sourceSymbol = item?.quote?.srcAsset?.symbol;
  const targetSymbol = item?.quote?.destAsset?.symbol;
  const hash = item?.status?.destChain?.txHash as Hex | undefined;

  const { chainId: payChainId, tokenAddress } =
    parentTransaction.metamaskPay ?? {};

  const sourceToken = useTokenWithBalance(
    tokenAddress ?? '0x0',
    payChainId ?? '0x0',
  );

  const sourceNetworkName = useNetworkName(transaction.chainId);
  const targetNetworkName = useNetworkName(chainId);

  if (hasTransactionType(transaction, [TransactionType.perpsDeposit])) {
    return {
      chainId: CHAIN_IDS.ARBITRUM,
      isReceiveOnly: true,
      targetNetworkName: 'Hyperliquid',
      targetSymbol: 'USDC',
    };
  }

  if (hasTransactionType(transaction, [TransactionType.predictDeposit])) {
    return {
      chainId: CHAIN_IDS.POLYGON,
      isReceiveOnly: true,
      targetNetworkName: 'Polygon',
      targetSymbol: POLYGON_USDCE.symbol,
    };
  }

  if (
    hasTransactionType(parentTransaction, [
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
    ])
  ) {
    return {
      sourceNetworkName,
      sourceSymbol: sourceToken?.symbol,
    };
  }

  return {
    chainId,
    hash,
    sourceNetworkName,
    sourceSymbol,
    targetNetworkName,
    targetSymbol,
    time,
  };
}
