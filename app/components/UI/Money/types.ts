/**
 * Discriminated union driving all Money balance-slot UIs.
 * Exactly one kind is active at a time.
 *
 * Precedence (highest → lowest):
 * featureDisabled > noAccount > error > retrying > loading > unavailable > balance
 *
 * `unavailable` covers the case where balance queries succeeded but a
 * dependency required to render the fiat balance (e.g. `musdFiatRate`)
 * is missing. Distinct from `error` because no actionable retry exists
 * at the view layer — token market data / currency rates are owned by
 * their respective controllers and hydrate on their own tick.
 */
export type MoneyBalanceDisplayState =
  | { kind: 'featureDisabled' }
  | { kind: 'noAccount' }
  | { kind: 'error'; onRetry: () => void }
  | { kind: 'retrying' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'balance'; value: string };
