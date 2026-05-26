/**
 * Discriminated union driving all Money balance-slot UIs.
 * Exactly one kind is active at a time.
 *
 * Precedence (highest → lowest):
 * featureDisabled > noAccount > error > retrying > loading > balance
 */
export type MoneyBalanceDisplayState =
  | { kind: 'featureDisabled' }
  | { kind: 'noAccount' }
  | { kind: 'error'; onRetry: () => void }
  | { kind: 'retrying' }
  | { kind: 'loading' }
  | { kind: 'balance'; value: string };
