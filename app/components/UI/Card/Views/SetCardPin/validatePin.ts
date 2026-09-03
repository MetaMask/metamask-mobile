const PIN_LENGTH = 4;
const REPEATING_PIN_PATTERN = /^(\d)\1{3}$/;

export type PinValidationResult =
  | { valid: true }
  | { valid: false; reason: 'length' | 'digits' | 'repeating' };

/**
 * Client-side Immersve PIN pre-validation.
 * Rejects anything that is not exactly 4 digits, and repeating sequences 0000–9999.
 * Remaining Immersve rules (DOB, PAN last4, phone, customer ref) are server-side only.
 */
export function validateCardPin(pin: string): PinValidationResult {
  if (pin.length !== PIN_LENGTH) {
    return { valid: false, reason: 'length' };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, reason: 'digits' };
  }
  if (REPEATING_PIN_PATTERN.test(pin)) {
    return { valid: false, reason: 'repeating' };
  }
  return { valid: true };
}

export { PIN_LENGTH };
