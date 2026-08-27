/**
 * Cross-screen marker for the Perps pay-with-token selector.
 *
 * The selector sheet is a separate navigation route from PerpsPayRow, and
 * re-selecting the already-selected token is a no-op for the pay-token state —
 * so token identity alone cannot tell an explicit selection from a dismissal.
 * The Perps selector rows call {@link markPerpsPaymentTokenSelection} on press;
 * PerpsPayRow resets the marker when it opens the selector and consumes it when
 * the screen regains focus, emitting `payment_token_selector_dismissed` only
 * when no explicit selection was made.
 */
let selectionMade = false;

/** Record that a Perps payment-token row was explicitly pressed. */
export function markPerpsPaymentTokenSelection(): void {
  selectionMade = true;
}

/** Clear any pending selection marker (called when the selector opens). */
export function resetPerpsPaymentTokenSelection(): void {
  selectionMade = false;
}

/** Read and clear the selection marker. */
export function consumePerpsPaymentTokenSelection(): boolean {
  const made = selectionMade;
  selectionMade = false;
  return made;
}
