import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import { selectCandidateSubscriptionId } from '../../../../reducers/rewards/selectors';
import Engine from '../../../../core/Engine';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Hook to manage fetching candidate subscription ID and setting it in Redux state
 * This hook doesn't return a value - the candidateSubscriptionId should be accessed via Redux selectors
 */
export const useCandidateSubscriptionId = () => {
  const dispatch = useDispatch();
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);

  const fetchCandidateSubscriptionId = useCallback(async () => {
    try {
      const candidateId = await Engine.controllerMessenger.call(
        'RewardsController:getCandidateSubscriptionId',
      );
      dispatch(setCandidateSubscriptionId(candidateId));
    } catch (error) {
      dispatch(setCandidateSubscriptionId('error'));
    }
  }, [dispatch]);

  useEffect(() => {
    if (candidateSubscriptionId === 'retry') {
      fetchCandidateSubscriptionId();
    }
  }, [candidateSubscriptionId, fetchCandidateSubscriptionId]);

  useFocusEffect(
    useCallback(() => {
      fetchCandidateSubscriptionId();
    }, [fetchCandidateSubscriptionId]),
  );
};
