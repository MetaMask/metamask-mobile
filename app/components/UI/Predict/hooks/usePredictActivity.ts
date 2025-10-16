import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import type { PredictActivity } from '../types';

interface UsePredictActivityOptions {
  providerId?: string;
  loadOnMount?: boolean;
  refreshOnFocus?: boolean;
}

interface UsePredictActivityReturn {
  activity: PredictActivity[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadActivity: (options?: { isRefresh?: boolean }) => Promise<void>;
}

export function usePredictActivity(
  options: UsePredictActivityOptions = {},
): UsePredictActivityReturn {
  const { providerId, loadOnMount = true, refreshOnFocus = true } = options;

  const [activity, setActivity] = useState<PredictActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const loadActivity = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
          setActivity([]);
        }
        setError(null);

        const controller = Engine.context.PredictController;
        const data = await controller.getActivity({
          address: selectedInternalAccountAddress,
          providerId,
        });
        setActivity(data ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load activity';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [providerId, selectedInternalAccountAddress],
  );

  useEffect(() => {
    if (loadOnMount) {
      loadActivity();
    }
  }, [loadOnMount, loadActivity]);

  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        loadActivity({ isRefresh: true });
      }
    }, [refreshOnFocus, loadActivity]),
  );

  return { activity, isLoading, isRefreshing, error, loadActivity };
}
