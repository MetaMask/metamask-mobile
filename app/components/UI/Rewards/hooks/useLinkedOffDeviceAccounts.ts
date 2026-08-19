import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { AuthorizationFailedError } from '../../../../core/Engine/controllers/rewards-controller/services/rewards-data-service';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
} from '../../../../reducers/rewards';

export interface OffDeviceAccount {
  /** Full CAIP-10 string as returned by the backend */
  caip10: string;
  /** Chain namespace:reference portion (e.g. "eip155:1") */
  caipChainId: string;
  /** Bare address portion of the CAIP-10 string */
  address: string;
}

/**
 * Returns the list of accounts that are linked to the subscription on the
 * backend (via the rewards API) but are NOT present on this device.
 *
 * The delta computation is performed inside the RewardsController and cached
 * for 5 minutes. Results are re-fetched on focus and on accountLinked events.
 */
export const useLinkedOffDeviceAccounts = (): OffDeviceAccount[] => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();
  const [offDeviceAccounts, setOffDeviceAccounts] = useState<
    OffDeviceAccount[]
  >([]);

  const fetchOffDeviceAccounts = useCallback(async (): Promise<void> => {
    if (!subscriptionId) {
      setOffDeviceAccounts([]);
      return;
    }

    try {
      const caip10Accounts = await Engine.controllerMessenger.call(
        'RewardsController:getOffDeviceSubscriptionAccounts',
        subscriptionId,
      );

      const parsed: OffDeviceAccount[] = [];
      for (const caip10 of caip10Accounts) {
        const lastColon = caip10.lastIndexOf(':');
        if (lastColon === -1) continue;
        parsed.push({
          caip10,
          caipChainId: caip10.slice(0, lastColon),
          address: caip10.slice(lastColon + 1),
        });
      }
      setOffDeviceAccounts(parsed);
    } catch (error) {
      if (error instanceof AuthorizationFailedError) {
        dispatch(resetRewardsState());
        dispatch(setCandidateSubscriptionId('retry'));
      }
      setOffDeviceAccounts([]);
    }
  }, [dispatch, subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      fetchOffDeviceAccounts();
    }, [fetchOffDeviceAccounts]),
  );

  const invalidateEvents = useMemo(
    () => ['RewardsController:accountLinked' as const],
    [],
  );

  useInvalidateByRewardEvents(invalidateEvents, fetchOffDeviceAccounts);

  return offDeviceAccounts;
};
