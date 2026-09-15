/**
 * Short-lived in-memory holder for the first PIN between Set and Confirm screens.
 * Intentionally not route params — avoids nav persistence / logging of the PIN.
 */
let draftPin: string | null = null;

export function setPinDraft(pin: string): void {
  draftPin = pin;
}

export function getPinDraft(): string | null {
  return draftPin;
}

export function clearPinDraft(): void {
  draftPin = null;
}
