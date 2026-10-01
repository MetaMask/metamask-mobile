import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { ClaimDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * In-flight claims from `GET /earnings/claim/me`. The ledger only carries
 * settled claims, so History reads this beside it.
 */
export function useInFlightClaims(profileId: string | undefined): {
  claims: ClaimDto[];
  refresh: () => Promise<void>;
} {
  const [claims, setClaims] = useState<ClaimDto[]>([]);

  const refresh = useCallback(async () => {
    if (!profileId) {
      setClaims([]);
      return;
    }
    try {
      const page = await Engine.controllerMessenger.call(
        'RewardsMoneyController:getClaimHistory',
        { forceFresh: true },
      );
      setClaims(page?.results ?? []);
    } catch {
      // Keep the last list. The ledger banner already covers a failed history read.
    }
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  return { claims, refresh };
}
