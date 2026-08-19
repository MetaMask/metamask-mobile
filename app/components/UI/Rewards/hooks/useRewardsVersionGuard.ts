import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  setVersionGuardMinimumMobileVersion,
  setVersionGuardLoading,
  setVersionGuardError,
} from '../../../../reducers/rewards';

interface UseRewardsVersionGuardOptions {
  refreshKey?: unknown;
}

interface UseRewardsVersionGuardReturn {
  fetchVersionRequirements: () => Promise<void>;
}

/**
 * Hook that fetches client version requirements from the rewards backend
 * and stores the result + loading/error state in Redux. The actual blocked
 * check is done via the selectIsRewardsVersionBlocked selector.
 */
const useRewardsVersionGuard = ({
  refreshKey,
}: UseRewardsVersionGuardOptions = {}): UseRewardsVersionGuardReturn => {
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);

  const fetchVersionRequirements = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    dispatch(setVersionGuardLoading(true));
    dispatch(setVersionGuardError(false));

    try {
      const requirements = await Engine.controllerMessenger.call(
        'RewardsController:getClientVersionRequirements',
      );
      dispatch(
        setVersionGuardMinimumMobileVersion(
          requirements.minimumMobileVersion ?? null,
        ),
      );
    } catch {
      dispatch(setVersionGuardError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setVersionGuardLoading(false));
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      // Refresh when callers pass a new route/page key while this screen is focused.
      void refreshKey;
      fetchVersionRequirements();
    }, [fetchVersionRequirements, refreshKey]),
  );

  return { fetchVersionRequirements };
};

export default useRewardsVersionGuard;
