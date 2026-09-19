import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  setReferralMe,
  setReferralMeError,
  setReferralMeLoading,
} from '../../../../reducers/rewardsMoney';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';

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
  try {
    const profile = await Engine.controllerMessenger.call(
      'AuthenticationController:getSessionProfile',
    );
    return profile?.profileId;
  } catch (error) {
    return undefined;
  }
}

/**
 * Whether the session moved off `expectedProfileId` while a request was in
 * flight. Re-reading the session is what makes this safe across hook
 * instances, which cannot see each other's refs. Adopts whatever profile is
 * current so the caller stops reading the superseded one.
 */
async function getCurrentSessionWhenChanged(
  expectedProfileId: string,
  setProfileId: (profileId: string | undefined) => void,
): Promise<string | undefined | null> {
  const currentProfileId = await resolveSessionProfileId();
  if (currentProfileId === expectedProfileId) {
    return null;
  }
  setProfileId(currentProfileId);
  return currentProfileId;
}

export interface SessionProfileIdResult {
  profileId: string | undefined;
  /**
   * The session read has come back. Until it has, an absent `profileId` means
   * "not known yet" rather than "signed out" — and profile-keyed state reads
   * empty either way, so a caller that cannot tell them apart will mistake a
   * pending session for a settled empty one.
   */
  isResolved: boolean;
}

/**
 * The Hydra profile id of the current session, which is the key the
 * `rewardsMoney` slice is written under.
 *
 * It is resolved asynchronously, so there is no synchronous selector for it and
 * a screen that only reads referral me still needs it to pick its entry. This
 * resolves the session and nothing else: a screen opened over a Rewards Home
 * that already fetched referral me must not fetch it again.
 */
export const useSessionProfileId = (): SessionProfileIdResult => {
  const [result, setResult] = useState<SessionProfileIdResult>({
    profileId: undefined,
    isResolved: false,
  });

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      const sessionProfileId = await resolveSessionProfileId();
      if (active) {
        setResult({ profileId: sessionProfileId, isResolved: true });
      }
    };
    resolve();

    return () => {
      active = false;
    };
  }, []);

  return result;
};

export type FetchReferralMeResult =
  | { status: 'settled'; profileId: string | undefined }
  | { status: 'discarded'; profileId: string | undefined };

/**
 * Fetches `GET /referral/me` and writes it into the profile-keyed
 * `rewardsMoney` slice.
 *
 * The returned `profileId` is the Hydra profile the entry was written under —
 * pass it to `selectReferralMeEntry` / `selectReferralMeVariant` to read the
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

  const runFetch = useCallback(
    async (forceFresh: boolean | undefined): Promise<FetchReferralMeResult> => {
      // No profile means no key to write under: there is nothing to settle,
      // and a signed-out session is not a referral error. Tracking it either
      // way clears a stale id so a previous session's variant cannot route.
      const sessionProfileId = await resolveSessionProfileId();
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
        const changedProfileId = await getCurrentSessionWhenChanged(
          sessionProfileId,
          setProfileId,
        );
        if (changedProfileId !== null) {
          return { status: 'discarded', profileId: changedProfileId };
        }
        if (!isLatestReferralMeRequest(sessionProfileId, requestGeneration)) {
          shouldSettleLoading = false;
          return { status: 'discarded', profileId: sessionProfileId };
        }
        dispatch(
          setReferralMe({ profileId: sessionProfileId, data: referralMe }),
        );
        return { status: 'settled', profileId: sessionProfileId };
      } catch (error) {
        const changedProfileId = await getCurrentSessionWhenChanged(
          sessionProfileId,
          setProfileId,
        );
        if (changedProfileId !== null) {
          return { status: 'discarded', profileId: changedProfileId };
        }
        if (!isLatestReferralMeRequest(sessionProfileId, requestGeneration)) {
          shouldSettleLoading = false;
          return { status: 'discarded', profileId: sessionProfileId };
        }
        dispatch(
          setReferralMeError({ profileId: sessionProfileId, error: true }),
        );
        return { status: 'settled', profileId: sessionProfileId };
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
    [dispatch],
  );

  const fetchReferralMe = useCallback(
    async ({
      forceFresh,
    }: {
      forceFresh?: boolean;
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
        .then(() => runFetch(forceFresh));
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

  useFocusEffect(
    useCallback(() => {
      if (!fetchOnMount) {
        return;
      }
      fetchReferralMe();
    }, [fetchOnMount, fetchReferralMe]),
  );

  return { profileId, fetchReferralMe };
};
