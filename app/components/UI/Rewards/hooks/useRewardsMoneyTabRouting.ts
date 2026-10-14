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
import { useReferralMe } from './useReferralMe';

const isMoneyDashboard = (
  persona: MoneyDashboardPersona | undefined,
): boolean => persona === 'referrer' || persona === 'referee';

interface ReferralResolution {
  resolved: boolean;
  profileId: string | undefined;
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
      const currentProfileId = profileIdRef.current;
      const cachedProfileId = sessionProfileIdRef.current;
      const cacheCanRoute =
        hasCachedReferralRef.current && cachedProfileId !== undefined;
      const profileKnownAndDifferent =
        currentProfileId !== undefined &&
        resolutionRef.current.profileId !== currentProfileId;

      if (!resolutionRef.current.resolved || profileKnownAndDifferent) {
        if (
          cacheCanRoute &&
          cachedProfileId &&
          (currentProfileId === undefined ||
            currentProfileId === cachedProfileId)
        ) {
          updateResolution({ resolved: true, profileId: cachedProfileId });
        } else {
          updateResolution({
            resolved: false,
            profileId: currentProfileId,
          });
        }
      }

      const resolveCurrentProfile = async () => {
        try {
          while (true) {
            if (!active) {
              return;
            }
            const result = await fetchReferralMe();
            if (!active) {
              return;
            }
            if (result.status === 'discarded') {
              if (result.profileId !== resolutionRef.current.profileId) {
                updateResolution({
                  resolved: false,
                  profileId: result.profileId,
                });
              }
              continue;
            }
            updateResolution({
              resolved: true,
              profileId: result.profileId,
            });
            return;
          }
        } catch {
          if (!active) {
            return;
          }
          // A failed refresh keeps the route the saved entry already opened.
          if (
            resolutionRef.current.resolved &&
            resolutionRef.current.profileId
          ) {
            return;
          }
          updateResolution({
            resolved: true,
            profileId: profileIdRef.current,
          });
        }
      };
      void resolveCurrentProfile();

      return () => {
        active = false;
      };
    }, [moneyEnabled, fetchReferralMe, updateResolution]),
  );

  const moneyReferralResolved =
    !moneyEnabled ||
    (resolution.resolved &&
      (profileId === undefined || resolution.profileId === profileId));
  const destinationFamily = isMoneyDashboard(moneyPersona)
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
