import { useMemo } from 'react';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { LIGHTER_MINIMUM_DEPOSIT } from '../../constants/perps';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useFormatters } from '../../../../hooks/useFormatters';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';

/**
 * Blocks a Lighter perps deposit below Lighter's minimum direct L1 deposit
 * (1 USDC). A smaller deposit would be rejected on-chain after the user has
 * already paid to bridge into USDC.
 *
 * Fees come out of the entered amount, so the amount that reaches Lighter can
 * be below the minimum even when the entered amount is not. Without a keypad
 * amount, the quoted amount received is checked too. Quotes for a previous
 * amount are ignored while the next quote loads.
 *
 * Reuses the fiat buy amount limit alert and copy shown for the money account
 * deposit minimum, so both minimums look the same.
 *
 * @param options - Optional overrides.
 * @param options.pendingAmount - USD amount currently on the keypad.
 * @returns A blocking alert while the amount entered or received is above 0
 * and below the minimum.
 */
export function useLighterDepositMinimumAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { pendingFiatAmount } = useConfirmationContext();
  const { formatCurrency } = useFormatters();
  const totals = useTransactionPayTotals();
  const isQuoteLoading = useIsTransactionPayLoading();

  const isLighterDeposit = hasTransactionType(transactionMeta, [
    TransactionType.perpsLighterDeposit,
  ]);

  const amount = Number(pendingAmount ?? pendingFiatAmount ?? '0');
  const receivedAmount =
    pendingAmount === undefined && !isQuoteLoading
      ? Number(totals?.targetAmount?.usd ?? '0')
      : 0;
  const isBelowMinimum = [amount, receivedAmount].some(
    (value) =>
      Number.isFinite(value) && value > 0 && value < LIGHTER_MINIMUM_DEPOSIT,
  );

  return useMemo(() => {
    if (!isLighterDeposit || !isBelowMinimum) {
      return NO_ALERTS;
    }

    return [
      {
        key: AlertKeys.FiatBuyAmountLimit,
        field: RowAlertKey.Amount,
        title: strings('alert_system.fiat_buy_amount_limit.title'),
        message: strings('fiat_on_ramp.min_deposit_limit', {
          amount: formatCurrency(LIGHTER_MINIMUM_DEPOSIT, 'USD', {
            currencyDisplay: 'narrowSymbol',
          }),
        }),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isLighterDeposit, isBelowMinimum, formatCurrency]);
}
