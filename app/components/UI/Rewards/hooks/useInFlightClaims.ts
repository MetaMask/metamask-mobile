import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { ClaimDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';

/**
 * In-flight claims from `GET /earnings/claim/me`. The ledger only carries
 * settled claims, so History reads this beside it.
 */
export function useInFlightClaims(profileId: string | undefined): {
  claims: ClaimDto[];
  refresh: (options?: { forceFresh?: boolean }) => Promise<void>;
} {
  const [claims, setClaims] = useState<ClaimDto[]>([]);

  const refresh = useCallback(
    async (options?: { forceFresh?: boolean }) => {
      if (!profileId) {
        setClaims([]);
        return;
      }
      try {
        const page = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getClaimHistory',
          { forceFresh: options?.forceFresh === true },
        );
        setClaims(page?.results ?? []);
      } catch (error) {
        // Keep the last list. The ledger banner already covers a failed history read.
        reportRewardsMoneyReadFailure(
          error,
          'inFlightClaims.fetch_failed',
          true,
          'rewards-money',
        );
      }
    },
    [profileId],
  );

  useFocusEffect(
    useCallback(() => {
      // Focus reads the controller cache. A claim that just opened passes
      // forceFresh so the new row is not hidden for the TTL.
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  return { claims, refresh };
}
