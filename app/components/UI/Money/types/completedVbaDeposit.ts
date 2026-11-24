/**
 * Minimal input required to format a completed VBA deposit for Money Activity.
 * This is not a backend response type or evidence that a deposit is settled.
 */
export interface CompletedVbaDepositDisplayInput {
  /** Positive mUSD amount in the token's smallest units. */
  amount: string;
  /** Number of decimal places used by mUSD on the settlement network. */
  decimals: number;
}
