import { IconName } from '@metamask/design-system-react-native';
import BigNumber from 'bignumber.js';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import type { MicrodepositActivity } from '../types/moneyActivity';

/**
 * MoonPay microdeposit as returned by neobank-proxy
 * `GET /neobank/customers/{id}/microdeposits`. The proxy is a 1:1 pass-through
 * of MoonPay's `Microdeposit` schema.
 *
 * shortcut: structural copy of the `NeoBankMicrodeposit` type that ships with
 * `NeoBankService.getMicrodeposits` in `@metamask/ramps-controller`. Replace
 * this declaration with the imported type once mobile pins a controller
 * release that carries it.
 */
export interface MicrodepositRemote {
  amount: string;
  currency_code: string;
  created_at: string;
  counterparty_name?: string;
}

/**
 * The subset of `NeoBankService` this feature calls. Narrowing here keeps the
 * hook compiling against the controller version mobile currently pins.
 *
 * @param service - The engine's `NeoBankService` instance.
 * @returns The service, or undefined when the pinned controller cannot serve
 * microdeposits.
 */
export function asMicrodepositService(
  service: unknown,
): { getMicrodeposits(): Promise<MicrodepositRemote[]> } | undefined {
  const candidate = service as
    | { getMicrodeposits?: () => Promise<MicrodepositRemote[]> }
    | undefined;
  return typeof candidate?.getMicrodeposits === 'function'
    ? (candidate as { getMicrodeposits(): Promise<MicrodepositRemote[]> })
    : undefined;
}

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
  deposit: MicrodepositRemote,
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
  deposits: readonly MicrodepositRemote[],
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
  const amount = new BigNumber(activity.amount);
  const hasValidAmount = amount.isFinite() && amount.isGreaterThan(0);
  const formattedAmount = hasValidAmount
    ? getIntlNumberFormatter(I18n.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }).format(amount.toNumber())
    : '';

  return {
    label: strings('money.transaction.microdeposit'),
    description: activity.counterpartyName
      ? strings('money.transaction.microdeposit_from', {
          name: activity.counterpartyName,
        })
      : strings('money.transaction.bank_transfer'),
    primaryAmount: hasValidAmount
      ? `+${formattedAmount} ${activity.currencyCode}`
      : '',
    fiatAmount: '',
    isIncoming: true,
    icon: IconName.Bank,
    status: 'confirmed',
    showPrimaryAmount: hasValidAmount,
  };
}
