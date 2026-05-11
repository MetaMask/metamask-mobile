import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';

import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import { ProgressListItem } from '../../progress-list';
import { useFiatOrderStatus } from '../../../hooks/activity/useFiatOrderStatus';

export function FiatOrderSummaryLine({
  parentTransaction,
}: {
  parentTransaction: TransactionMeta;
}) {
  const { fiatOrderId, fiatProvider } = parentTransaction.metamaskPay ?? {};
  const walletAddress = parentTransaction.txParams.from as string | undefined;

  const { severity, statusText } = useFiatOrderStatus(
    fiatOrderId,
    fiatProvider,
    walletAddress,
    parentTransaction.status,
  );

  const title = strings('transaction_details.summary_title.fiat_purchase');
  const subtitle = formatSubtitle(parentTransaction.time, statusText);

  return (
    <ProgressListItem title={title} subtitle={subtitle} severity={severity} />
  );
}

function formatSubtitle(timestamp: number, statusText: string): string {
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

  return `${statusText} • ${timeString} • ${dateString}`;
}
