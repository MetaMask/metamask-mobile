import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { selectReferralMeVariant } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import type { ReferralVariant } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useReferralMe } from './useReferralMe';

const isMoneyPersona = (variant: ReferralVariant | undefined): boolean =>
  variant === 'REFERRER' || variant === 'REFEREE';

interface ReferralResolution {
  resolved: boolean;
  profileId: string | undefined;
}

export interface RewardsMoneyTabRouting {
  moneyEnabled: boolean;
  /**
   * Profile resolution plus the first referral-me fetch have settled. Stays
   * true across later refetches, and is true when Money is disabled — nothing
   * will ever settle then, and the tab must not wait for it.
   */
  moneyReferralResolved: boolean;
  moneyVariant: ReferralVariant | undefined;
  /** Remounts the nested stack when its destination family or profile changes. */
  navigatorKey: string;
}

/**
 * Resolves which home the Rewards tab opens on.
 */
export function useRewardsMoneyTabRouting(): RewardsMoneyTabRouting {
  const moneyEnabled = useSelector(selectRewardsMoneyControllerEnabled);

  // Driven from here rather than on mount so the gate below can close on a
  // settled fetch. A signed-out session resolves no profile id and writes
  // nothing, so Redux never reports that run as finished.
  const { profileId, fetchReferralMe } = useReferralMe({
    fetchOnMount: false,
  });
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;
  const [resolution, setResolution] = useState<ReferralResolution>({
    resolved: false,
    profileId: undefined,
  });
  const resolutionRef = useRef(resolution);
  resolutionRef.current = resolution;

  const updateResolution = useCallback((next: ReferralResolution) => {
    resolutionRef.current = next;
    setResolution(next);
  }, []);

  const moneyVariant = useSelector((state: RootState) =>
    selectReferralMeVariant(state, profileId),
  );

  useFocusEffect(
    useCallback(() => {
      if (!moneyEnabled) {
        updateResolution({ resolved: false, profileId: undefined });
        return undefined;
      }

      let active = true;
      const currentProfileId = profileIdRef.current;
      if (
        !resolutionRef.current.resolved ||
        resolutionRef.current.profileId !== currentProfileId
      ) {
        updateResolution({
          resolved: false,
          profileId: currentProfileId,
        });
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
        } catch (error) {
          if (active) {
            updateResolution({
              resolved: true,
              profileId: profileIdRef.current,
            });
          }
        }
      };
      resolveCurrentProfile();

      return () => {
        active = false;
      };
    }, [moneyEnabled, fetchReferralMe, updateResolution]),
  );

  const moneyReferralResolved =
    !moneyEnabled ||
    (resolution.resolved && resolution.profileId === profileId);
  const destinationFamily = isMoneyPersona(moneyVariant)
    ? 'rewards-money'
    : 'rewards';
  const navigatorKey = `${profileId ?? 'unknown'}:${destinationFamily}`;

  return {
    moneyEnabled,
    moneyReferralResolved,
    moneyVariant,
    navigatorKey,
  };
}
