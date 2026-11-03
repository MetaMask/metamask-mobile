import { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { captureException } from '@sentry/react-native';
import Engine from '../../../../core/Engine';
import {
  setReferralMe,
  setReferralMeError,
  setReferralMeLoading,
} from '../../../../reducers/rewardsMoney';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';
import { useOneShotBusyRefetch } from './useOneShotBusyRefetch';

const referralMeRequestGenerationByProfile = new Map<string, number>();

function startReferralMeRequest(profileId: string): number {
  const generation =
    (referralMeRequestGenerationByProfile.get(profileId) ?? 0) + 1;
  referralMeRequestGenerationByProfile.set(profileId, generation);
  return generation;
}

function isLatestReferralMeRequest(
  profileId: string,
  generation: number,
): boolean {
  return referralMeRequestGenerationByProfile.get(profileId) === generation;
}

async function resolveSessionProfileId(): Promise<string | undefined> {
  const profile = await Engine.controllerMessenger.call(
    'AuthenticationController:getSessionProfile',
  );
  return profile?.profileId;
}

class SessionProfileUnavailableError extends Error {
  constructor() {
    super('Session profile unavailable');
    this.name = 'SessionProfileUnavailableError';
  }
}

type SessionRecheck =
  | { status: 'unchanged' }
  | { status: 'changed'; profileId: string | undefined }
  | { status: 'unavailable' };

/**
 * Whether the session moved off `expectedProfileId` while a request was in
 * flight. Re-reading the session is what makes this safe across hook
 * instances, which cannot see each other's refs. Adopts whatever profile is
 * current so the caller stops reading the superseded one.
 *
 * A failed re-read is `unavailable`, not a sign-out: it must not clear the
 * profile the request started with.
 */
async function recheckSession(
  expectedProfileId: string,
  setProfileId: (profileId: string | undefined) => void,
): Promise<SessionRecheck> {
  try {
    const currentProfileId = await resolveSessionProfileId();
    if (currentProfileId === expectedProfileId) {
      return { status: 'unchanged' };
    }
    setProfileId(currentProfileId);
    return { status: 'changed', profileId: currentProfileId };
  } catch {
    return { status: 'unavailable' };
  }
}

export type FetchReferralMeResult =
  | { status: 'settled'; profileId: string | undefined }
  | { status: 'discarded'; profileId: string | undefined };

function captureRewardsMoney(error: unknown, context: string): void {
  captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { feature: 'rewards-money', context },
  });
}

type SessionGate =
  | { kind: 'unavailable' }
  | {
      kind: 'discarded';
      profileId: string | undefined;
      shouldSettleLoading: boolean;
    }
  | { kind: 'current' };

/**
 * A session that moved, or a newer request for the same profile, discards
 * this read. An unanswered re-read is not a sign-out.
 */
async function sessionGate(
  sessionProfileId: string,
  setProfileId: (profileId: string | undefined) => void,
  requestGeneration: number,
): Promise<SessionGate> {
  const recheck = await recheckSession(sessionProfileId, setProfileId);
  if (recheck.status === 'unavailable') {
    return { kind: 'unavailable' };
  }
  if (recheck.status === 'changed') {
    return {
      kind: 'discarded',
      profileId: recheck.profileId,
      shouldSettleLoading: true,
    };
  }
  if (!isLatestReferralMeRequest(sessionProfileId, requestGeneration)) {
    return {
      kind: 'discarded',
      profileId: sessionProfileId,
      shouldSettleLoading: false,
    };
  }
  return { kind: 'current' };
}

function discardedReferralRead(
  gate: Extract<SessionGate, { kind: 'discarded' }>,
): {
  shouldSettleLoading: boolean;
  result: FetchReferralMeResult;
} {
  return {
    shouldSettleLoading: gate.shouldSettleLoading,
    result: { status: 'discarded', profileId: gate.profileId },
  };
}

/**
 * A session miss after the read started is rethrown and writes nothing. A
 * moved or superseded session discards the read. Anything else is this
 * profile's own failure.
 */
async function settleReferralMeFailure({
  error,
  sessionProfileId,
  requestGeneration,
  setProfileId,
  onFailure,
}: {
  error: unknown;
  sessionProfileId: string;
  requestGeneration: number;
  setProfileId: (profileId: string | undefined) => void;
  onFailure: () => void;
}): Promise<{
  shouldSettleLoading: boolean;
  result: FetchReferralMeResult;
}> {
  if (error instanceof SessionProfileUnavailableError) {
    captureRewardsMoney(error, 'referralMe.session_unavailable');
    throw error;
  }
  const gate = await sessionGate(
    sessionProfileId,
    setProfileId,
    requestGeneration,
  );
  if (gate.kind === 'unavailable') {
    throw error;
  }
  if (gate.kind === 'discarded') {
    return discardedReferralRead(gate);
  }
  onFailure();
  return {
    shouldSettleLoading: true,
    result: { status: 'settled', profileId: sessionProfileId },
  };
}

/**
 * Fetches `GET /referral/me` and writes it into the profile-keyed
 * `rewardsMoney` slice.
 *
 * The returned `profileId` is the Hydra profile the entry was written under —
 * pass it to `selectReferralMeEntry` / `selectMoneyDashboardPersona` to read the
 * result. Returning it instead of selecting inside the hook keeps the
 * selectors free of any dependency on this hook.
 */
export const useReferralMe = ({
  fetchOnMount = true,
}: {
  fetchOnMount?: boolean;
} = {}): {
  profileId: string | undefined;
  fetchReferralMe: (options?: {
    forceFresh?: boolean;
  }) => Promise<FetchReferralMeResult>;
} => {
  const dispatch = useDispatch();
  const [profileId, setProfileId] = useState<string | undefined>(undefined);
  const inFlightRef = useRef<Promise<FetchReferralMeResult> | null>(null);
  const { cancel: cancelBusyRefetch, arm: armBusyRefetch } =
    useOneShotBusyRefetch();
  const fetchRef = useRef<
    (options?: {
      forceFresh?: boolean;
      followUp?: boolean;
    }) => Promise<FetchReferralMeResult>
  >(() =>
    Promise.resolve({
      status: 'settled',
      profileId: undefined,
    }),
  );

  const runFetch = useCallback(
    async (
      forceFresh: boolean | undefined,
      followUp: boolean,
    ): Promise<FetchReferralMeResult> => {
      cancelBusyRefetch();
      // A thrown lookup is a transient miss, not a sign-out. Rejecting leaves
      // the profile id already on screen in place. An answered lookup with no
      // profile id is a sign-out: there is nothing to write, and clearing the
      // id stops the previous session's variant from routing.
      let sessionProfileId: string | undefined;
      try {
        sessionProfileId = await resolveSessionProfileId();
      } catch (error) {
        captureRewardsMoney(error, 'referralMe.session_unavailable');
        throw error;
      }
      setProfileId(sessionProfileId);
      if (!sessionProfileId) {
        return { status: 'settled', profileId: undefined };
      }

      dispatch(
        setReferralMeLoading({ profileId: sessionProfileId, loading: true }),
      );
      dispatch(
        setReferralMeError({ profileId: sessionProfileId, error: false }),
      );
      const requestGeneration = startReferralMeRequest(sessionProfileId);
      let shouldSettleLoading = true;

      try {
        const referralMe: ReferralMeDto = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getReferralMe',
          { forceFresh },
        );
        const gate = await sessionGate(
          sessionProfileId,
          setProfileId,
          requestGeneration,
        );
        if (gate.kind === 'unavailable') {
          throw new SessionProfileUnavailableError();
        }
        if (gate.kind === 'discarded') {
          shouldSettleLoading = gate.shouldSettleLoading;
          return discardedReferralRead(gate).result;
        }
        dispatch(
          setReferralMe({ profileId: sessionProfileId, data: referralMe }),
        );
        return { status: 'settled', profileId: sessionProfileId };
      } catch (error) {
        const failed = await settleReferralMeFailure({
          error,
          sessionProfileId,
          requestGeneration,
          setProfileId,
          onFailure: () => {
            reportRewardsMoneyReadFailure(
              error,
              'referralMe.fetch_failed',
              followUp,
              'rewards-money',
            );
            dispatch(
              setReferralMeError({ profileId: sessionProfileId, error: true }),
            );
            if (!followUp) {
              armBusyRefetch(error, () => {
                void fetchRef.current({ forceFresh: true, followUp: true });
              });
            }
          },
        });
        shouldSettleLoading = failed.shouldSettleLoading;
        return failed.result;
      } finally {
        // A session-change discard settles the old profile's loading state.
        // A same-profile superseded request does not: its newer request owns
        // loading now and must be the one that settles it.
        if (shouldSettleLoading) {
          dispatch(
            setReferralMeLoading({
              profileId: sessionProfileId,
              loading: false,
            }),
          );
        }
      }
    },
    [armBusyRefetch, cancelBusyRefetch, dispatch],
  );

  const fetchReferralMe = useCallback(
    async ({
      forceFresh,
      followUp = false,
    }: {
      forceFresh?: boolean;
      followUp?: boolean;
    } = {}): Promise<FetchReferralMeResult> => {
      const inFlight = inFlightRef.current;

      // A plain refresh adds nothing to one already running, but a forceFresh
      // asked for data newer than that run and queues behind it instead.
      if (inFlight && !forceFresh) {
        // Rejections belong to the run that owns them; re-raising here would
        // report the same failure twice.
        return inFlight;
      }

      const run = (inFlight ?? Promise.resolve())
        .catch(() => undefined)
        .then(() => runFetch(forceFresh, followUp));
      inFlightRef.current = run;

      try {
        return await run;
      } finally {
        if (inFlightRef.current === run) {
          inFlightRef.current = null;
        }
      }
    },
    [runFetch],
  );
  fetchRef.current = fetchReferralMe;

  useFocusEffect(
    useCallback(() => {
      if (!fetchOnMount) {
        return;
      }
      void fetchReferralMe();
    }, [fetchOnMount, fetchReferralMe]),
  );

  return { profileId, fetchReferralMe };
};
