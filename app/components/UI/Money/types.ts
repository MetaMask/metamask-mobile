/**
 * Discriminated union driving all Money balance-slot UIs.
 * Exactly one kind is active at a time.
 *
 * Precedence (highest → lowest):
 * noAccount > balance > unavailable
 *
 * `unavailable` covers any case where a fresh balance cannot be shown — still
 * loading, a fetch error, or a missing dependency required to format the fiat
 * balance (e.g. `musdFiatRate`). When a previously fetched balance is cached
 * for the current account it is carried in `lastKnownValue` and rendered as a
 * muted "last known" figure; otherwise the slot shows a dash. A BannerAlert
 * accompanies this state at the view layer.
 */
export type MoneyBalanceDisplayState =
  | { kind: 'noAccount' }
  | { kind: 'unavailable'; lastKnownValue?: string }
  | { kind: 'balance'; value: string };
