import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { MUSD_TOKEN } from '../../Earn/constants/musd';
import { moneyFormatUsd } from './moneyFormatFiat';
import type { CompletedVbaDepositDisplayInput } from '../types/completedVbaDeposit';

/**
 * Formats a confirmed VBA deposit for Money activity presentation.
 * The caller must establish settlement from its authoritative source.
 *
 * @param deposit - Minimal token amount data used for display only.
 * @returns Completed-deposit row presentation with positive amounts.
 */
export function completedVbaDepositDisplayInfo(
  deposit: CompletedVbaDepositDisplayInput,
): MoneyTransactionDisplayInfo {
  const rawAmount = new BigNumber(deposit.amount);
  const validAmount =
    rawAmount.isFinite() &&
    rawAmount.isInteger() &&
    rawAmount.isGreaterThanOrEqualTo(0) &&
    Number.isInteger(deposit.decimals) &&
    deposit.decimals >= 0 &&
    deposit.decimals <= 18;

  if (!validAmount) {
    const amountUnavailable = strings(
      'money.api_activity_details.amount_unavailable',
    );
    return {
      description: strings('money.transaction.bank_transfer'),
      label: strings('money.transaction.deposited'),
      primaryAmount: amountUnavailable,
      fiatAmount: amountUnavailable,
      isIncoming: true,
      icon: IconName.Add,
      status: 'confirmed',
    };
  }

  const amount = rawAmount.shiftedBy(-deposit.decimals);
  const amountAsNumber = amount.toNumber();
  if (!Number.isFinite(amountAsNumber)) {
    const amountUnavailable = strings(
      'money.api_activity_details.amount_unavailable',
    );
    return {
      description: strings('money.transaction.bank_transfer'),
      label: strings('money.transaction.deposited'),
      primaryAmount: amountUnavailable,
      fiatAmount: amountUnavailable,
      isIncoming: true,
      icon: IconName.Add,
      status: 'confirmed',
    };
  }

  const formattedAmount = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amountAsNumber);

  return {
    description: strings('money.transaction.bank_transfer'),
    label: strings('money.transaction.deposited'),
    primaryAmount: `+${formattedAmount} ${MUSD_TOKEN.symbol}`,
    fiatAmount: `+${moneyFormatUsd(amount)}`,
    isIncoming: true,
    icon: IconName.Add,
    status: 'confirmed',
  };
}
