import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

/**
 * In-flight SumSub applicant-token prefetch, or `null` when none is cached.
 * Never persisted: the token is a short-lived SDK access token that only
 * travels in memory, and a taken prefetch is gone.
 */
let prefetchPromise: Promise<string | undefined> | null = null;

/**
 * Starts fetching the SumSub applicant access token (`createJourney`) for the
 * current KYC session so `KycController.launchProviderFlow` does not have to.
 * No-op while a prefetch is already in flight or when there is no session.
 *
 * Fire-and-forget: a failed prefetch resolves to `undefined` when taken, and
 * the controller then creates its own token as before.
 */
export const prefetchSumsubToken = (): void => {
  if (prefetchPromise) {
    return;
  }
  const { KycController, KycService } = Engine.context;
  const sessionId = KycController?.state?.sessionStatus?.id;
  if (!KycService || !sessionId) {
    return;
  }

  prefetchPromise = KycService.createJourney(sessionId).then(
    (journey) => journey.applicantAccessToken,
    (error: unknown) => {
      Logger.error(error as Error, {
        tags: { feature: 'vba-kyc', provider: 'sumsub' },
        context: { name: 'prefetchSumsubToken' },
      });
      return undefined;
    },
  );
};

/**
 * Consumes the prefetched SumSub applicant access token, if any. One-shot:
 * the prefetch is cleared on first take and a later take resolves to
 * `undefined`, leaving the controller to create a fresh token.
 */
export const takePrefetchedSumsubToken = (): Promise<string | undefined> => {
  const promise = prefetchPromise;
  prefetchPromise = null;
  return promise ?? Promise.resolve(undefined);
};
