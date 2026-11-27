import { useMemo } from 'react';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { LIGHTER_MINIMUM_WITHDRAW } from '../../constants/perps';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useFormatters } from '../../../../hooks/useFormatters';

/**
 * Blocks a Lighter perps withdraw below the minimum (2 USD). Lighter charges a
 * flat 1 USD fee on withdraw, so a smaller amount would leave nothing to
 * receive.
 *
 * @param options - Optional overrides.
 * @param options.pendingAmount - USD amount currently on the keypad.
 * @returns A blocking alert while the amount is above 0 and below the minimum.
 */
export function useLighterWithdrawMinimumAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { pendingFiatAmount } = useConfirmationContext();
  const { formatCurrency } = useFormatters();

  const isLighterWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsLighterWithdraw,
  ]);

  const amount = Number(pendingAmount ?? pendingFiatAmount ?? '0');
  const isBelowMinimum =
    Number.isFinite(amount) && amount > 0 && amount < LIGHTER_MINIMUM_WITHDRAW;

  return useMemo(() => {
    if (!isLighterWithdraw || !isBelowMinimum) {
      return NO_ALERTS;
    }

    return [
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        title: strings('alert_system.fiat_buy_amount_limit.title'),
        message: strings('alert_system.lighter_withdraw_minimum.message', {
          amount: formatCurrency(LIGHTER_MINIMUM_WITHDRAW, 'USD', {
            currencyDisplay: 'narrowSymbol',
          }),
        }),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isLighterWithdraw, isBelowMinimum, formatCurrency]);
}
