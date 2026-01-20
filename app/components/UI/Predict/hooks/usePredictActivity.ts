import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import type { PredictActivity } from '../types';
import { ensureError } from '../utils/predictErrorHandler';

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

  const loadActivity = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const controller = Engine.context.PredictController;
        const data = await controller.getActivity({
          providerId,
        });
        setActivity(data ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load activity';
        setError(message);

        // Capture exception with activity loading context (no user address)
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictActivity',
          },
          context: {
            name: 'usePredictActivity',
            data: {
              method: 'loadActivity',
              action: 'activity_load',
              operation: 'data_fetching',
              providerId,
            },
          },
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [providerId],
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
