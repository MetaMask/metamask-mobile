import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import I18n from '../../../../../../../locales/i18n';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { ProgressListItem } from '../../progress-list';
import { Severity } from '../../status-icon';

export function TransactionSummaryLine({
  chainId,
  explorerName: explorerNameOverride,
  explorerUrl: explorerUrlOverride,
  time,
  title,
  transactionMeta,
  txHash,
}: {
  chainId?: Hex;
  explorerName?: string;
  explorerUrl?: string;
  time?: number;
  title: string;
  transactionMeta: TransactionMeta;
  txHash?: Hex;
}) {
  const navigation = useNavigation();

  const resolvedChainId = chainId ?? transactionMeta.chainId;
  const rawHash = txHash ?? transactionMeta.hash;
  const resolvedTxHash = rawHash && rawHash !== '0x0' ? rawHash : undefined;
  const resolvedTime =
    time ?? transactionMeta.submittedTime ?? transactionMeta.time;

  const dateString = getDateString(resolvedTime);

  const blockExplorer =
    useMultichainBlockExplorerTxUrl({
      chainId: parseInt(resolvedChainId, 16),
      txHash: resolvedTxHash,
    }) ?? {};

  const explorerTxUrl = explorerUrlOverride ?? blockExplorer.explorerTxUrl;
  const explorerName = explorerNameOverride ?? blockExplorer.explorerName;
  const severity = getSeverity(transactionMeta.status);
  const tooltip = getErrorMessage(transactionMeta);

  const handleExplorerClick = useCallback(() => {
    if (!explorerTxUrl) {
      return;
    }

    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: explorerTxUrl, title: explorerName },
    });
  }, [explorerName, explorerTxUrl, navigation]);

  return (
    <ProgressListItem
      title={title}
      subtitle={dateString}
      severity={severity}
      tooltip={tooltip}
      buttonIcon={explorerTxUrl ? IconName.Export : undefined}
      onButtonPress={explorerTxUrl ? handleExplorerClick : undefined}
    />
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

function getSeverity(status: TransactionStatus): Severity {
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

function getErrorMessage(transactionMeta: TransactionMeta): string | undefined {
  const { error } = transactionMeta;

  if (!error) return undefined;

  if (error.stack) {
    try {
      const start = error.stack.indexOf('{');
      const end = error.stack.lastIndexOf('}');
      const stackObject = JSON.parse(error.stack.substring(start, end + 1));
      const stackMessage = stackObject?.data?.message;

      if (stackMessage) {
        return stackMessage;
      }
    } catch {
      // Ignore parse errors, fall through to default message
    }
  }

  return error.message;
}
