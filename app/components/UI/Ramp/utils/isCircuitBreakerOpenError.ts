import { BrokenCircuitError } from '@metamask/controller-utils';

const CIRCUIT_BREAKER_OPEN_ERROR_KEY = 'CIRCUIT_BREAKER_OPEN';

/**
 * Whether a ramps call failed because the service circuit breaker is open.
 *
 * NeoBank `createAutoramp` throws {@link BrokenCircuitError} with no
 * `errorKey`. Transak OTP verification keeps that class and sets `errorKey`.
 *
 * @param error - The caught value.
 * @returns True when the error is an open circuit.
 */
export const isCircuitBreakerOpenError = (error: unknown): boolean => {
  if (error instanceof BrokenCircuitError) {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('errorKey' in error)) {
    return false;
  }
  return (
    (error as { errorKey?: unknown }).errorKey ===
    CIRCUIT_BREAKER_OPEN_ERROR_KEY
  );
};
