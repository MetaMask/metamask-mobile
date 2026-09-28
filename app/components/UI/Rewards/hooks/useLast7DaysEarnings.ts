import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';

export interface Last7DaysEarningsState {
  data: EarningsSummaryDto | null;
  isLoading: boolean;
  error: boolean;
  retry: () => void;
}

/** UTC `YYYY-MM-DD`. */
function formatUtcDay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The seven UTC dates ending today, inclusive.
 *
 * The summary window is a closed range of earning days, so today and the six
 * days before it are seven days, not an instant range of 168 hours.
 */
export function last7DaysUtcWindow(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = formatUtcDay(now);
  const fromDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6),
  );
  return { from: formatUtcDay(fromDate), to };
}

/**
 * Windowed `GET /earnings/summary` for the card's last-7-days total.
 *
 * Held in component state on purpose. The heroes read the unwindowed summary
 * from Redux, and a windowed payload omits `claimable`, so writing it under
 * the same profile key would blank the claimable balance.
 */
export const useLast7DaysEarnings = (
  profileId: string | undefined,
): Last7DaysEarningsState => {
  const [data, setData] = useState<EarningsSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLast7Days = useCallback(
    async ({ forceFresh }: { forceFresh?: boolean } = {}): Promise<void> => {
      if (!profileId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(false);

      try {
        const { from, to } = last7DaysUtcWindow();
        const summary: EarningsSummaryDto =
          await Engine.controllerMessenger.call(
            'RewardsMoneyController:getEarningsSummary',
            { from, to, includeClaimable: false, forceFresh },
          );
        setData(summary);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [profileId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchLast7Days();
    }, [fetchLast7Days]),
  );

  const retry = useCallback(() => {
    fetchLast7Days({ forceFresh: true });
  }, [fetchLast7Days]);

  return { data, isLoading, error, retry };
};
