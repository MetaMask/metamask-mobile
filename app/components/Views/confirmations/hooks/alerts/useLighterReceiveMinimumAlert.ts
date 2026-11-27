import { useMemo } from 'react';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { LIGHTER_MINIMUM_DEPOSIT } from '../../constants/perps';
import { strings } from '../../../../../../locales/i18n';
import { getPerpsBalanceProvider } from '../../utils/perps-balance-asset';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayTotals } from '../pay/useTransactionPayData';

/**
 * Blocks a transfer from the Hyperliquid balance to Lighter when the quote
 * would deliver less than Lighter's minimum deposit (1 USDC). The transfer is
 * input-based, so the provider fees come out of the amount received, and
 * Lighter rejects the delivery, which the provider then refunds.
 *
 * Covers a Lighter deposit paid from the Hyperliquid balance and a Hyperliquid
 * withdraw to the Lighter balance.
 *
 * @returns A blocking alert while the quoted amount received is above 0 and
 * below the minimum.
 */
export function useLighterReceiveMinimumAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { payToken } = useTransactionPayToken();
  const totals = useTransactionPayTotals();

  const payTokenProvider = getPerpsBalanceProvider(payToken?.assetId);

  const isHyperliquidToLighter =
    (payTokenProvider === 'hyperliquid' &&
      hasTransactionType(transactionMeta, [
        TransactionType.perpsLighterDeposit,
      ])) ||
    (payTokenProvider === 'lighter' &&
      hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw]));

  const receivedUsd = new BigNumber(totals?.targetAmount?.usd ?? '0');
  const isBelowMinimum =
    receivedUsd.isFinite() &&
    receivedUsd.isGreaterThan(0) &&
    receivedUsd.isLessThan(LIGHTER_MINIMUM_DEPOSIT);

  return useMemo(() => {
    if (!isHyperliquidToLighter || !isBelowMinimum) {
      return NO_ALERTS;
    }

    return [
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        title: strings('alert_system.fiat_buy_amount_limit.title'),
        message: strings('alert_system.pay_amount_too_low.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isHyperliquidToLighter, isBelowMinimum]);
}
