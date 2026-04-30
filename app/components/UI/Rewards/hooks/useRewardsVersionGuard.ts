import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  setVersionGuardMinimumMobileVersion,
  setVersionGuardLoading,
  setVersionGuardError,
} from '../../../../reducers/rewards';

interface UseRewardsVersionGuardReturn {
  fetchVersionRequirements: () => Promise<void>;
}

/**
 * Hook that fetches client version requirements from the rewards backend
 * and stores the result + loading/error state in Redux. The actual blocked
 * check is done via the selectIsRewardsVersionBlocked selector.
 */
const useRewardsVersionGuard = (): UseRewardsVersionGuardReturn => {
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
      fetchVersionRequirements();
    }, [fetchVersionRequirements]),
  );

  return { fetchVersionRequirements };
};

export default useRewardsVersionGuard;
