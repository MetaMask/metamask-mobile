import { CardProviderError } from '../../../../core/Engine/controllers/card-controller/provider-types';

/** Short TTL so focus refetch is not thrashing, while staying fresher than card-home's 60s. */
export const REDEEM_STALE_TIME_MS = 30_000;

export const shouldRetryRedeemQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= 2) return false;
  if (error instanceof CardProviderError && error.statusCode !== undefined) {
    // Do not retry client errors (incl. 401 — auth retry already happened in controller).
    if (error.statusCode >= 400 && error.statusCode < 500) return false;
  }
  return true;
};
