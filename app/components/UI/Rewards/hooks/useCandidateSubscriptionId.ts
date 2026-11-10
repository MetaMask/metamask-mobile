import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { captureException } from '@sentry/react-native';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import { selectCandidateSubscriptionId } from '../../../../reducers/rewards/selectors';
import Engine from '../../../../core/Engine';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Fetches the candidate subscription id into Redux.
 *
 * The Rewards tab refreshes on focus. HomeTabs passes `refreshOnFocus: false`
 * so returning to the main tabs does not scan opt-in status again; the retry
 * state still refetches.
 */
export const useCandidateSubscriptionId = ({
  refreshOnFocus = true,
}: {
  refreshOnFocus?: boolean;
} = {}) => {
  const dispatch = useDispatch();
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);

  const fetchCandidateSubscriptionId = useCallback(async () => {
    try {
      const candidateId = await Engine.controllerMessenger.call(
        'RewardsController:getCandidateSubscriptionId',
      );
      dispatch(setCandidateSubscriptionId(candidateId));
    } catch (error) {
      captureException(error as Error, {
        tags: {
          feature: 'rewards',
          context: 'candidateSubscriptionId.fetch_failed',
        },
      });
      dispatch(setCandidateSubscriptionId('error'));
    }
  }, [dispatch]);

  useEffect(() => {
    if (candidateSubscriptionId === 'retry') {
      void fetchCandidateSubscriptionId();
    }
  }, [candidateSubscriptionId, fetchCandidateSubscriptionId]);

  useEffect(() => {
    if (refreshOnFocus) {
      return;
    }
    void fetchCandidateSubscriptionId();
  }, [fetchCandidateSubscriptionId, refreshOnFocus]);

  useFocusEffect(
    useCallback(() => {
      if (!refreshOnFocus) {
        return undefined;
      }
      void fetchCandidateSubscriptionId();
      return undefined;
    }, [fetchCandidateSubscriptionId, refreshOnFocus]),
  );
};
