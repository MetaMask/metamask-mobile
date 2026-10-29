import { IconName } from '@metamask/design-system-react-native';
import type { NeoBankMicrodeposit } from '@metamask/ramps-controller';
import { strings } from '../../../../../locales/i18n';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import type { MicrodepositActivity } from '../types/moneyActivity';
import { moneyFormatIncomingAmount } from './moneyFormatFiat';

/**
 * Builds the row identity. MoonPay sends no id, and its list is cumulative
 * across repeat deposit rounds, so the fields that identify one credit are
 * the key. Two rows identical in all of them are indistinguishable and are
 * collapsed.
 *
 * @param deposit - One MoonPay microdeposit.
 * @param time - Parsed `created_at`, epoch ms.
 * @returns Stable row id.
 */
export function getMicrodepositId(
  deposit: NeoBankMicrodeposit,
  time: number,
): string {
  return [
    time,
    deposit.amount,
    deposit.currency_code,
    deposit.counterparty_name ?? '',
  ].join('|');
}

/**
 * Maps MoonPay microdeposits into Money activity rows, newest first.
 * Drops entries without a parseable `created_at`, which have no place in a
 * time-ordered feed.
 *
 * @param deposits - Raw microdeposits from `NeoBankService.getMicrodeposits`.
 * @returns Activity rows, deduped and time-descending.
 */
export function mapMicrodeposits(
  deposits: readonly NeoBankMicrodeposit[],
): MicrodepositActivity[] {
  const seen = new Set<string>();
  const rows: MicrodepositActivity[] = [];

  for (const deposit of deposits) {
    const time = Date.parse(deposit.created_at);
    if (Number.isNaN(time)) {
      continue;
    }

    const id = getMicrodepositId(deposit, time);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    rows.push({
      id,
      amount: deposit.amount,
      currencyCode: deposit.currency_code,
      counterpartyName: deposit.counterparty_name,
      time,
    });
  }

  return rows.sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
}

/**
 * Presentation for a microdeposit row.
 *
 * @param activity - The microdeposit row.
 * @returns Display info for {@link ActivityRowView}.
 */
export function microdepositDisplayInfo(
  activity: MicrodepositActivity,
): MoneyTransactionDisplayInfo {
  const primaryAmount = moneyFormatIncomingAmount(
    activity.amount,
    activity.currencyCode,
  );

  return {
    label: strings('money.transaction.microdeposit'),
    description: activity.counterpartyName
      ? strings('money.transaction.microdeposit_from', {
          name: activity.counterpartyName,
        })
      : strings('money.transaction.microdeposit_from_bank'),
    primaryAmount,
    fiatAmount: '',
    isIncoming: true,
    icon: IconName.Bank,
    status: 'confirmed',
    showPrimaryAmount: Boolean(primaryAmount),
  };
}
