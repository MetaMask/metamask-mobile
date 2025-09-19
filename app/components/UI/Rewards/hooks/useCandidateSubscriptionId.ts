import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

/**
 * Hook to manage fetching candidate subscription ID and setting it in Redux state
 * This hook doesn't return a value - the candidateSubscriptionId should be accessed via Redux selectors
 */
export const useCandidateSubscriptionId = () => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  useEffect(() => {
    const getCandidateId = async () => {
      try {
        const candidateId = await Engine.controllerMessenger.call(
          'RewardsController:getCandidateSubscriptionId',
        );
        dispatch(setCandidateSubscriptionId(candidateId));
      } catch (error) {
        dispatch(setCandidateSubscriptionId('error'));
      }
    };

    if (!subscriptionId) {
      // if this account has not opted in or we had an error while checking opt-in status, get the candidate subscription ID
      dispatch(setCandidateSubscriptionId('pending'));
      getCandidateId();
    }
  }, [subscriptionId, dispatch]);
};
