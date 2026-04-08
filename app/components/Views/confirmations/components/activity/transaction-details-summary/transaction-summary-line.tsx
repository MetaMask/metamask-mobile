import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import I18n from '../../../../../../../locales/i18n';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import { useMultichainBlockExplorerTxUrl } from '../../../../../UI/Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { ProgressListItem } from '../../progress-list';
import { getErrorMessage, getSeverity } from '../../../utils/transaction';

interface TransactionSummaryLineProps {
  chainId?: Hex;
  explorerName?: string;
  explorerUrl?: string;
  time?: number;
  title: string;
  transactionMeta: TransactionMeta;
  txHash?: Hex;
}

export function TransactionSummaryLine({
  chainId,
  explorerName: explorerNameOverride,
  explorerUrl: explorerUrlOverride,
  time,
  title,
  transactionMeta,
  txHash,
}: TransactionSummaryLineProps) {
  const navigation = useNavigation();

  const resolvedChainId = chainId ?? transactionMeta.chainId;
  const rawHash = txHash ?? transactionMeta.hash;
  const resolvedTxHash = rawHash && rawHash !== '0x0' ? rawHash : undefined;
  const resolvedTime =
    time ?? transactionMeta.submittedTime ?? transactionMeta.time;

  const dateString = getDateString(resolvedTime);

  const blockExplorer = useMultichainBlockExplorerTxUrl({
    chainId: parseInt(resolvedChainId, 16),
    txHash: resolvedTxHash,
  });

  const explorerTxUrl = explorerUrlOverride ?? blockExplorer?.explorerTxUrl;
  const explorerName = explorerNameOverride ?? blockExplorer?.explorerName;
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
