import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { type Hex } from '@metamask/utils';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  FontWeight,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import {
  selectTransactionsByBatchId,
  selectTransactionsByIds,
} from '../../../../../selectors/transactionController';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import { RELAY_DEPOSIT_TYPES } from '../../../../Views/confirmations/constants/confirmations';
import { useMultichainBlockExplorerTxUrl } from '../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { useFiatOrderStatus } from '../../../../Views/confirmations/hooks/activity/useFiatOrderStatus';
import { useTheme } from '../../../../../util/theme';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';

const styles = StyleSheet.create({
  timelineColumn: {
    width: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  connectorContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
    justifyContent: 'space-evenly',
  },
  connectorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});

type Severity = 'success' | 'error' | 'warning';

function getDotColor(
  severity: Severity,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (severity) {
    case 'success':
      return colors.success.default;
    case 'error':
      return colors.error.default;
    default:
      return colors.warning.default;
  }
}

function getTextColorForSeverity(severity: Severity): TextColor | undefined {
  switch (severity) {
    case 'error':
      return TextColor.ErrorDefault;
    default:
      return undefined;
  }
}

function getSeverityFromStatus(status: TransactionStatus): Severity {
  switch (status) {
    case TransactionStatus.confirmed:
      return 'success';
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return 'error';
    default:
      return 'warning';
  }
}

function formatDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const timeStr = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);
  return `${timeStr} • ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

function StepRow({
  title,
  subtitle,
  severity,
  explorerUrl,
  explorerName,
  isLast = false,
}: {
  title: string;
  subtitle: string;
  severity: Severity;
  explorerUrl?: string;
  explorerName?: string;
  isLast?: boolean;
}) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const dot = getDotColor(severity, colors);
  const textColor = getTextColorForSeverity(severity);

  const handleExplorerPress = () => {
    if (explorerUrl) {
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url: explorerUrl, title: explorerName },
      });
    }
  };

  return (
    <Box twClassName="flex-row">
      {/* Left timeline column: dot + connector */}
      <Box twClassName="items-center" style={styles.timelineColumn}>
        <View
          testID="step-dot"
          style={[styles.stepDot, { backgroundColor: dot }]}
        />
        {!isLast && (
          <View style={styles.connectorContainer}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.connectorDot,
                  { backgroundColor: colors.icon.muted },
                ]}
              />
            ))}
          </View>
        )}
      </Box>
      {/* Right content column: title, explorer button, subtitle */}
      <Box twClassName="flex-1 ml-3 gap-1">
        <Box twClassName="flex-row justify-between items-center">
          <Text
            color={textColor}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
          >
            {title}
          </Text>
          {explorerUrl ? (
            <ButtonIcon
              testID="step-explorer-button"
              accessibilityLabel={title}
              iconName={IconName.Export}
              size={ButtonIconSize.Sm}
              onPress={handleExplorerPress}
            />
          ) : null}
        </Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {subtitle}
        </Text>
      </Box>
    </Box>
  );
}

function FiatOrderStepItem({
  parentTransaction,
  isLast = false,
}: {
  parentTransaction: TransactionMeta;
  isLast?: boolean;
}) {
  const { fiat } = parentTransaction.metamaskPay ?? {};
  const fiatOrderId = fiat?.orderId;
  const fiatProvider = fiat?.provider;
  const walletAddress = parentTransaction.txParams.from;

  const { severity, statusText, cryptoSymbol, paymentMethodName } =
    useFiatOrderStatus(
      fiatOrderId,
      fiatProvider,
      walletAddress,
      parentTransaction.status,
    );

  const title =
    cryptoSymbol && paymentMethodName
      ? strings('transaction_details.summary_title.fiat_purchase', {
          token: cryptoSymbol,
          paymentMethod: paymentMethodName,
        })
      : strings('transaction_details.summary_title.fiat_purchase', {
          token: '...',
          paymentMethod: '...',
        });

  const subtitle = `${statusText} • ${formatDateString(parentTransaction.time)}`;

  return <StepRow title={title} subtitle={subtitle} severity={severity} isLast={isLast} />;
}

function SourceHashStepItem({
  parentTransaction,
  sourceHash,
  isLast = false,
}: {
  parentTransaction: TransactionMeta;
  sourceHash: Hex;
  isLast?: boolean;
}) {
  const sourceTokenAddress = parentTransaction.metamaskPay?.tokenAddress;
  const sourceTokenChainId = parentTransaction.metamaskPay?.chainId;
  const sourceToken = useTokenWithBalance(
    sourceTokenAddress ?? '0x0',
    sourceTokenChainId ?? '0x0',
  );
  const sourceNetworkName = useNetworkName(sourceTokenChainId);

  const blockExplorer = useMultichainBlockExplorerTxUrl({
    chainId: parseInt(sourceTokenChainId ?? '0x0', 16),
    txHash: sourceHash,
  });

  let title = strings('transaction_details.summary_title.bridge_send_loading');
  if (sourceToken?.symbol && sourceNetworkName) {
    title = strings('transaction_details.summary_title.bridge_send', {
      sourceSymbol: sourceToken.symbol,
      sourceChain: sourceNetworkName,
    });
  }

  const severity = getSeverityFromStatus(parentTransaction.status);
  const subtitle = formatDateString(parentTransaction.time);

  return (
    <StepRow
      title={title}
      subtitle={subtitle}
      severity={severity}
      explorerUrl={blockExplorer?.explorerTxUrl}
      explorerName={blockExplorer?.explorerName}
      isLast={isLast}
    />
  );
}

function DepositStepItem({
  transactionMeta,
  parentTransaction,
  isLast = false,
}: {
  transactionMeta: TransactionMeta;
  parentTransaction: TransactionMeta;
  isLast?: boolean;
}) {
  const tokenAddress = parentTransaction.metamaskPay?.tokenAddress;
  const tokenChainId = parentTransaction.metamaskPay?.chainId;
  const sourceToken = useTokenWithBalance(
    tokenAddress ?? '0x0',
    tokenChainId ?? transactionMeta.chainId,
  );
  const sourceNetworkName = useNetworkName(transactionMeta.chainId);
  const isMusdConversion = hasTransactionType(parentTransaction, [
    TransactionType.musdConversion,
  ]);

  const blockExplorer = useMultichainBlockExplorerTxUrl({
    chainId: parseInt(transactionMeta.chainId, 16),
    txHash:
      transactionMeta.hash && transactionMeta.hash !== '0x0'
        ? transactionMeta.hash
        : undefined,
  });

  const title =
    sourceToken?.symbol && sourceNetworkName
      ? strings(
          isMusdConversion
            ? 'transaction_details.summary_title.musd_convert_send'
            : 'transaction_details.summary_title.bridge_send',
          {
            sourceSymbol: sourceToken.symbol,
            sourceChain: sourceNetworkName,
          },
        )
      : strings('transaction_details.summary_title.bridge_send_loading');

  const severity = getSeverityFromStatus(transactionMeta.status);
  const subtitle = formatDateString(
    transactionMeta.submittedTime ?? transactionMeta.time,
  );

  return (
    <StepRow
      title={title}
      subtitle={subtitle}
      severity={severity}
      explorerUrl={blockExplorer?.explorerTxUrl}
      explorerName={blockExplorer?.explorerName}
      isLast={isLast}
    />
  );
}

function ReceiveStepItem({
  transactionMeta,
  isLast = false,
}: {
  transactionMeta: TransactionMeta;
  isLast?: boolean;
}) {
  const { chainId: targetChainId, metamaskPay } = transactionMeta;
  const sourceChainId = metamaskPay?.chainId;

  const isPerpsDeposit = hasTransactionType(transactionMeta, [
    TransactionType.perpsDeposit,
  ]);

  const targetNetworkName = useNetworkName(targetChainId);
  const blockExplorer = useMultichainBlockExplorerTxUrl({
    chainId: parseInt(
      isPerpsDeposit ? '0xa4b1' : targetChainId,
      16,
    ),
    txHash:
      transactionMeta.hash && transactionMeta.hash !== '0x0'
        ? transactionMeta.hash
        : undefined,
  });

  let targetSymbol = 'mUSD';
  let finalTargetNetworkName: string | undefined = targetNetworkName;

  if (isPerpsDeposit) {
    targetSymbol = 'USDC';
    finalTargetNetworkName = 'Hyperliquid';
  }

  const title =
    targetSymbol && finalTargetNetworkName
      ? strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol,
          targetChain: finalTargetNetworkName,
        })
      : strings('transaction_details.summary_title.bridge_receive_loading');

  const severity = getSeverityFromStatus(transactionMeta.status);
  const subtitle = formatDateString(
    transactionMeta.submittedTime ?? transactionMeta.time,
  );

  const explorerUrl =
    isPerpsDeposit && transactionMeta.hash
      ? `https://app.hyperliquid.xyz/explorer/tx/${transactionMeta.hash}`
      : blockExplorer?.explorerTxUrl;

  const explorerName = isPerpsDeposit
    ? 'Hyperliquid'
    : blockExplorer?.explorerName;

  return (
    <StepRow
      title={title}
      subtitle={subtitle}
      severity={severity}
      explorerUrl={explorerUrl}
      explorerName={explorerName}
      isLast={isLast}
    />
  );
}

function DefaultStepItem({
  transactionMeta,
  isLast = false,
}: {
  transactionMeta: TransactionMeta;
  isLast?: boolean;
}) {
  const { type } = transactionMeta;
  const blockExplorer = useMultichainBlockExplorerTxUrl({
    chainId: parseInt(transactionMeta.chainId, 16),
    txHash:
      transactionMeta.hash && transactionMeta.hash !== '0x0'
        ? transactionMeta.hash
        : undefined,
  });

  let title: string;
  switch (type) {
    case TransactionType.swap:
      title = strings('transaction_details.summary_title.swap');
      break;
    case TransactionType.swapApproval:
    case TransactionType.tokenMethodApprove:
      title = strings('transaction_details.summary_title.swap_approval');
      break;
    default:
      title = strings('transaction_details.summary_title.default');
  }

  const severity = getSeverityFromStatus(transactionMeta.status);
  const subtitle = formatDateString(
    transactionMeta.submittedTime ?? transactionMeta.time,
  );

  return (
    <StepRow
      title={title}
      subtitle={subtitle}
      severity={severity}
      explorerUrl={blockExplorer?.explorerTxUrl}
      explorerName={blockExplorer?.explorerName}
      isLast={isLast}
    />
  );
}

function TransactionStepItem({
  transactionMeta,
  parentTransaction,
  isLast = false,
}: {
  transactionMeta: TransactionMeta;
  parentTransaction: TransactionMeta;
  isLast?: boolean;
}) {
  if (hasTransactionType(transactionMeta, RELAY_DEPOSIT_TYPES)) {
    return (
      <DepositStepItem
        transactionMeta={transactionMeta}
        parentTransaction={parentTransaction}
        isLast={isLast}
      />
    );
  }

  if (
    hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
      TransactionType.musdConversion,
    ])
  ) {
    return <ReceiveStepItem transactionMeta={transactionMeta} isLast={isLast} />;
  }

  return <DefaultStepItem transactionMeta={transactionMeta} isLast={isLast} />;
}

function isSkippedTransaction(
  transaction: TransactionMeta,
  parentTransaction: TransactionMeta,
): boolean {
  return (
    hasTransactionType(parentTransaction, [TransactionType.musdConversion]) &&
    !hasTransactionType(transaction, [TransactionType.relayDeposit])
  );
}

export function MoneyTransactionDetailsSummary() {
  const { transactionMeta } = useTransactionDetails();
  const {
    batchId,
    id: transactionId,
    metamaskPay,
    requiredTransactionIds,
  } = transactionMeta;

  const batchTransactions = useSelector((state: RootState) =>
    selectTransactionsByBatchId(state, batchId ?? ''),
  );

  const batchTransactionIds = useMemo(
    () =>
      batchTransactions
        .filter((transaction) => transaction.id !== transactionId)
        .map((transaction) => transaction.id),
    [batchTransactions, transactionId],
  );

  const transactionIds = useMemo(
    () => [
      ...(requiredTransactionIds ?? []),
      ...(batchTransactionIds ?? []),
      transactionId,
    ],
    [requiredTransactionIds, batchTransactionIds, transactionId],
  );

  const allTransactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, transactionIds),
  );

  const transactions = allTransactions.filter(
    (transaction) =>
      !isSkippedTransaction(transaction, transactionMeta) ||
      transaction.id === transactionId,
  );

  const hasDepositTransactions =
    (requiredTransactionIds?.length ?? 0) > 0 || batchTransactionIds.length > 0;

  const { sourceHash, fiat } = metamaskPay ?? {};
  const { orderId: fiatOrderId } = fiat ?? {};

  const hasFiatOrder = Boolean(fiatOrderId);
  const hasSourceHash = !hasDepositTransactions && Boolean(sourceHash);

  const totalSteps =
    transactions.length + (hasFiatOrder ? 1 : 0) + (hasSourceHash ? 1 : 0);
  const completedTxCount = transactions.filter(
    (tx) => tx.status === TransactionStatus.confirmed,
  ).length;
  const isParentConfirmed =
    transactionMeta.status === TransactionStatus.confirmed;
  const completedCount =
    completedTxCount +
    (hasFiatOrder && isParentConfirmed ? 1 : 0) +
    (hasSourceHash && isParentConfirmed ? 1 : 0);

  const noTransactions = transactions.length === 0;
  const fiatOrderIsLast =
    hasFiatOrder && !hasSourceHash && noTransactions;
  const sourceHashIsLast = hasSourceHash && noTransactions;

  return (
    <Box twClassName="gap-3">
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        {strings('transaction_details.label.steps_completed', {
          count: Math.min(completedCount, totalSteps).toString(),
        })}
      </Text>
      <Box>
        {hasFiatOrder ? (
          <FiatOrderStepItem
            parentTransaction={transactionMeta}
            isLast={fiatOrderIsLast}
          />
        ) : null}
        {hasSourceHash ? (
          <SourceHashStepItem
            parentTransaction={transactionMeta}
            sourceHash={sourceHash as Hex}
            isLast={sourceHashIsLast}
          />
        ) : null}
        {transactions.map((tx, index) => (
          <TransactionStepItem
            key={tx.id}
            transactionMeta={tx}
            parentTransaction={transactionMeta}
            isLast={index === transactions.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
}
