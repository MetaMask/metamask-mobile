/**
 * Position-scoped single-flight locks shared by every mounted sell surface.
 * A component-local ref prevents same-frame duplicate presses; this registry
 * also prevents two simultaneously mounted instances for the same position
 * (for example, a sheet and a routed screen) from placing duplicate orders.
 *
 * Each acquisition returns an owner token, and only that owner can release
 * the lock. A flow that was cancelled while validating can therefore release
 * early without freeing a lock that a newer flow holds.
 */
const inFlightSellPositions = new Map<string, symbol>();

export type PredictSellExecutionLockToken = symbol;

export const acquirePredictSellExecutionLock = (
  positionKey: string,
): PredictSellExecutionLockToken | null => {
  if (inFlightSellPositions.has(positionKey)) {
    return null;
  }
  const token = Symbol(positionKey);
  inFlightSellPositions.set(positionKey, token);
  return token;
};

export const releasePredictSellExecutionLock = (
  positionKey: string,
  token: PredictSellExecutionLockToken,
): void => {
  if (inFlightSellPositions.get(positionKey) === token) {
    inFlightSellPositions.delete(positionKey);
  }
};

/** Test-only: clears every held lock between test cases. */
export const resetPredictSellExecutionLocks = (): void => {
  inFlightSellPositions.clear();
};
