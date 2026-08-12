import { useSelector } from 'react-redux';
import {
  PaymentOverride,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';

import type { RootState } from '../../../../../../reducers';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { selectAccountGroupNamesByAddress } from '../../../../../../components/hooks/DisplayName/useAccountNames';
import {
  selectTransactionPayIsMaxAmountByTransactionId,
  selectTransactionPayQuotesByTransactionId,
  selectTransactionDataByTransactionId,
  selectAccountOverrideByTransactionId,
  selectPaymentOverrideByTransactionId,
} from '../../../../../../selectors/transactionPayController';

interface RelayQuoteOriginalShape {
  request?: { tradeType?: string };
  fees?: { subsidized?: { amountUsd?: string } };
  metamask?: { isExecute?: boolean; is7702?: boolean };
}

export interface MmPayQuoteDebugRow {
  label: string;
  value: string;
  boolValue?: boolean;
  infoValue?: string;
}

export interface MmPayQuoteDebug {
  isRelay: boolean;
  rows: MmPayQuoteDebugRow[];
  rawQuote: unknown;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'undefined';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function isSubsidized(original: RelayQuoteOriginalShape): boolean {
  const amountUsd = original?.fees?.subsidized?.amountUsd;
  if (amountUsd === undefined || amountUsd === null) {
    return false;
  }
  const parsed = Number(amountUsd);
  return Number.isFinite(parsed) ? parsed !== 0 : false;
}

export function useMmPayQuoteDebug(): MmPayQuoteDebug {
  const transactionMeta = useTransactionMetadataRequest();
  const txId = transactionMeta?.id ?? '';

  const quotes = useSelector((state: RootState) =>
    selectTransactionPayQuotesByTransactionId(state, txId),
  );
  const isMaxAmount = useSelector((state: RootState) =>
    selectTransactionPayIsMaxAmountByTransactionId(state, txId),
  );
  const transactionPay = useSelector((state: RootState) =>
    selectTransactionDataByTransactionId(state, txId),
  );
  const accountOverride = useSelector((state: RootState) =>
    selectAccountOverrideByTransactionId(state, txId),
  );
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, txId),
  );
  const accountGroupNames = useSelector(selectAccountGroupNamesByAddress);

  const currentQuote = quotes?.[0];
  const isRelay = currentQuote?.strategy === TransactionPayStrategy.Relay;

  if (!isRelay || !currentQuote) {
    return { isRelay: false, rows: [], rawQuote: currentQuote };
  }

  const original = currentQuote.original as RelayQuoteOriginalShape;

  const subsidized = isSubsidized(original);
  const isExecute = original?.metamask?.isExecute;
  const is7702 = original?.metamask?.is7702;
  const maxAmount = Boolean(isMaxAmount);

  const accountOverrideGroupName = accountOverride
    ? accountGroupNames[accountOverride.toLowerCase()]
    : undefined;

  const paymentOverrideLabel =
    paymentOverride === PaymentOverride.MoneyAccount
      ? strings('confirm.pay_with_bottom_sheet.money_account')
      : undefined;

  const rows: MmPayQuoteDebugRow[] = [
    { label: 'tradeType', value: formatValue(original?.request?.tradeType) },
    {
      label: 'accountOverride',
      value: formatValue(accountOverride),
      infoValue: accountOverrideGroupName,
    },
    {
      label: 'paymentOverride',
      value: formatValue(paymentOverride),
      infoValue: paymentOverrideLabel,
    },
    {
      label: 'isExecute',
      value: formatValue(isExecute),
      boolValue: typeof isExecute === 'boolean' ? isExecute : undefined,
    },
    {
      label: 'isSubsidized',
      value: formatValue(subsidized),
      boolValue: subsidized,
    },
    {
      label: 'is7702',
      value: formatValue(is7702),
      boolValue: typeof is7702 === 'boolean' ? is7702 : undefined,
    },
    {
      label: 'isMaxAmount',
      value: formatValue(maxAmount),
      boolValue: maxAmount,
    },
    { label: 'refundTo', value: formatValue(transactionPay?.refundTo) },
  ];

  return { isRelay: true, rows, rawQuote: currentQuote };
}
