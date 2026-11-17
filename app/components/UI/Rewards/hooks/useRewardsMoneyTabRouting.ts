import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import {
  selectMoneyDashboardPersona,
  selectReferralMeEntry,
  type MoneyDashboardPersona,
} from '../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../selectors/identity';
import type { RootState } from '../../../../reducers';
import { useReferralMe, type FetchReferralMeResult } from './useReferralMe';

const isMoneyDashboard = (
  persona: MoneyDashboardPersona | undefined,
): boolean => persona === 'referrer' || persona === 'referee';

interface ReferralResolution {
  resolved: boolean;
  profileId: string | undefined;
}

/**
 * The resolution to publish when the tab is focused, or undefined when the
 * current one already routes this profile. A saved entry opens immediately.
 */
function resolutionForFocus({
  resolved,
  resolutionProfileId,
  currentProfileId,
  cachedProfileId,
  cacheCanRoute,
}: {
  resolved: boolean;
  resolutionProfileId: string | undefined;
  currentProfileId: string | undefined;
  cachedProfileId: string | undefined;
  cacheCanRoute: boolean;
}): ReferralResolution | undefined {
  const profileKnownAndDifferent =
    currentProfileId !== undefined && resolutionProfileId !== currentProfileId;
  if (resolved && !profileKnownAndDifferent) {
    return undefined;
  }
  if (
    cacheCanRoute &&
    cachedProfileId &&
    (currentProfileId === undefined || currentProfileId === cachedProfileId)
  ) {
    return { resolved: true, profileId: cachedProfileId };
  }
  return { resolved: false, profileId: currentProfileId };
}

/** A moved session is retried. More than this, with no pause, is a request loop. */
const DISCARDED_REFRESH_LIMIT = 3;
const DISCARDED_REFRESH_DELAY_MS = 1_000;

function delayDiscardedRefresh(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, DISCARDED_REFRESH_DELAY_MS);
  });
}

/** A failed refresh keeps the route a saved entry already opened. */
function keepCachedRouteOnRefreshFailure(
  active: boolean,
  resolution: ReferralResolution,
  profileId: string | undefined,
  updateResolution: (next: ReferralResolution) => void,
): void {
  if (!active) {
    return;
  }
  if (resolution.resolved && resolution.profileId) {
    return;
  }
  updateResolution({ resolved: true, profileId });
}

async function refreshUntilSettled({
  isActive,
  fetchReferralMe,
  resolution,
  updateResolution,
  profileId,
}: {
  isActive: () => boolean;
  fetchReferralMe: () => Promise<FetchReferralMeResult>;
  resolution: () => ReferralResolution;
  updateResolution: (next: ReferralResolution) => void;
  profileId: () => string | undefined;
}): Promise<void> {
  let discarded = 0;
  try {
    while (isActive()) {
      const result = await fetchReferralMe();
      if (!isActive()) {
        return;
      }
      if (result.status === 'discarded') {
        discarded += 1;
        noteDiscardedProfile(result.profileId, resolution, updateResolution);
        if (discarded >= DISCARDED_REFRESH_LIMIT) {
          keepCachedRouteOnRefreshFailure(
            isActive(),
            resolution(),
            profileId(),
            updateResolution,
          );
          return;
        }
        await delayDiscardedRefresh();
        continue;
      }
      updateResolution({ resolved: true, profileId: result.profileId });
      return;
    }
  } catch {
    keepCachedRouteOnRefreshFailure(
      isActive(),
      resolution(),
      profileId(),
      updateResolution,
    );
  }
}

function noteDiscardedProfile(
  profileId: string | undefined,
  resolution: () => ReferralResolution,
  updateResolution: (next: ReferralResolution) => void,
): void {
  if (profileId === resolution().profileId) {
    return;
  }
  updateResolution({ resolved: false, profileId });
}

export interface RewardsMoneyTabRouting {
  moneyEnabled: boolean;
  /**
   * Profile resolution plus the first referral-me fetch have settled, or a
   * saved entry is already on the device. Stays true across later refetches,
   * and is true when Money is disabled — nothing will ever settle then, and
   * the tab must not wait for it.
   */
  moneyReferralResolved: boolean;
  /**
   * `referrer` or `referee` opens the Money dashboard. `plain` keeps the
   * points dashboard. `undefined` means the fetch has not resolved.
   */
  moneyPersona: MoneyDashboardPersona | undefined;
  /** Remounts the nested stack when its destination family or profile changes. */
  navigatorKey: string;
  /**
   * Profile the tab is routing with. The persisted session id counts before
   * the referral fetch returns.
   */
  profileId: string | undefined;
}

/**
 * Resolves which home the Rewards tab opens on.
 *
 * A saved referral-me entry for the persisted session opens the tab
 * immediately. The focus refresh updates it in the background and does not
 * put the skeleton back. While the wallet is locked the session id is not
 * knowable, so the tab waits rather than opening on a stale profile.
 */
export function useRewardsMoneyTabRouting(): RewardsMoneyTabRouting {
  const moneyEnabled = useSelector(selectRewardsMoneyControllerEnabled);
  const sessionProfileId = useSelector(selectSessionProfileId);
  const cachedEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, sessionProfileId),
  );
  const hasCachedReferral = Boolean(cachedEntry?.data);

  // Driven from here rather than on mount so the gate below can close on a
  // settled fetch. A signed-out session resolves no profile id and writes
  // nothing, so Redux never reports that run as finished.
  const { profileId, fetchReferralMe } = useReferralMe({
    fetchOnMount: false,
  });
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;
  const sessionProfileIdRef = useRef(sessionProfileId);
  sessionProfileIdRef.current = sessionProfileId;
  const hasCachedReferralRef = useRef(hasCachedReferral);
  hasCachedReferralRef.current = hasCachedReferral;

  const [resolution, setResolution] = useState<ReferralResolution>(() =>
    moneyEnabled && hasCachedReferral && sessionProfileId
      ? { resolved: true, profileId: sessionProfileId }
      : { resolved: false, profileId: undefined },
  );
  const resolutionRef = useRef(resolution);
  resolutionRef.current = resolution;

  const updateResolution = useCallback((next: ReferralResolution) => {
    resolutionRef.current = next;
    setResolution(next);
  }, []);

  // Rehydrate can land the saved entry after the first render.
  useEffect(() => {
    if (!moneyEnabled || !hasCachedReferral || !sessionProfileId) {
      return;
    }
    if (profileId !== undefined && profileId !== sessionProfileId) {
      return;
    }
    if (
      resolution.profileId !== undefined &&
      resolution.profileId !== sessionProfileId
    ) {
      return;
    }
    if (resolution.resolved && resolution.profileId === sessionProfileId) {
      return;
    }
    updateResolution({ resolved: true, profileId: sessionProfileId });
  }, [
    moneyEnabled,
    hasCachedReferral,
    sessionProfileId,
    profileId,
    resolution.resolved,
    resolution.profileId,
    updateResolution,
  ]);

  const routingProfileId =
    profileId !== undefined
      ? profileId
      : resolution.resolved
        ? resolution.profileId
        : undefined;

  const moneyPersona = useSelector((state: RootState) =>
    selectMoneyDashboardPersona(state, routingProfileId),
  );

  useFocusEffect(
    useCallback(() => {
      if (!moneyEnabled) {
        updateResolution({ resolved: false, profileId: undefined });
        return undefined;
      }

      let active = true;
      const cachedProfileId = sessionProfileIdRef.current;
      const nextResolution = resolutionForFocus({
        resolved: resolutionRef.current.resolved,
        resolutionProfileId: resolutionRef.current.profileId,
        currentProfileId: profileIdRef.current,
        cachedProfileId,
        cacheCanRoute:
          hasCachedReferralRef.current && cachedProfileId !== undefined,
      });
      if (nextResolution) {
        updateResolution(nextResolution);
      }

      void refreshUntilSettled({
        isActive: () => active,
        fetchReferralMe,
        resolution: () => resolutionRef.current,
        updateResolution,
        profileId: () => profileIdRef.current,
      });

      return () => {
        active = false;
      };
    }, [moneyEnabled, fetchReferralMe, updateResolution]),
  );

  const moneyReferralResolved =
    !moneyEnabled ||
    (resolution.resolved &&
      (profileId === undefined || resolution.profileId === profileId));
  // The flag is part of the key. RewardsHome applies its initial route only
  // when this key changes, so turning Money off has to leave that family.
  const destinationFamily =
    moneyEnabled && isMoneyDashboard(moneyPersona)
      ? 'rewards-money'
      : 'rewards';
  const navigatorKey = `${routingProfileId ?? 'unknown'}:${destinationFamily}`;

  return {
    moneyEnabled,
    moneyReferralResolved,
    moneyPersona,
    navigatorKey,
    profileId: routingProfileId,
  };
}
