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
import { getPerpsBalanceProvider } from '../../utils/perps-balance-asset';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useFormatters } from '../../../../hooks/useFormatters';

/**
 * Blocks moving funds out of Lighter below the minimum (2 USD), on a Lighter
 * perps withdraw or a Perps deposit paid from the Lighter balance. Lighter
 * charges a flat 1 USD fee when funds leave it, so a smaller amount would leave
 * nothing to receive.
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
  const { payToken } = useTransactionPayToken();

  const isLighterWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsLighterWithdraw,
  ]);

  const isLighterBalanceDeposit =
    getPerpsBalanceProvider(payToken?.assetId) === 'lighter' &&
    hasTransactionType(transactionMeta, [TransactionType.perpsDeposit]);

  const amount = Number(pendingAmount ?? pendingFiatAmount ?? '0');
  const isBelowMinimum =
    Number.isFinite(amount) && amount > 0 && amount < LIGHTER_MINIMUM_WITHDRAW;

  return useMemo(() => {
    if ((!isLighterWithdraw && !isLighterBalanceDeposit) || !isBelowMinimum) {
      return NO_ALERTS;
    }

    const minimum = formatCurrency(LIGHTER_MINIMUM_WITHDRAW, 'USD', {
      currencyDisplay: 'narrowSymbol',
    });

    return [
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        title: strings('alert_system.fiat_buy_amount_limit.title'),
        message: isLighterWithdraw
          ? strings('alert_system.lighter_withdraw_minimum.message', {
              amount: minimum,
            })
          : strings('fiat_on_ramp.min_deposit_limit', { amount: minimum }),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [
    isLighterWithdraw,
    isLighterBalanceDeposit,
    isBelowMinimum,
    formatCurrency,
  ]);
}
