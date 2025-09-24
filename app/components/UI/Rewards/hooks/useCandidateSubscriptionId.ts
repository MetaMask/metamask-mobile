import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import {
  selectRewardsActiveAccountHasOptedIn,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import Logger from '../../../../util/Logger';

/**
 * Hook to manage fetching candidate subscription ID and setting it in Redux state
 * This hook doesn't return a value - the candidateSubscriptionId should be accessed via Redux selectors
 */
export const useCandidateSubscriptionId = () => {
  const dispatch = useDispatch();
  const account = useSelector(selectSelectedInternalAccount);
  const hasAccountedOptedIn = useSelector(selectRewardsActiveAccountHasOptedIn);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  useEffect(() => {
    const getCandidateId = async () => {
      try {
        Logger.log(
          'useCandidateSubscriptionId: Getting candidate subscription ID',
        );
        const candidateId = await Engine.controllerMessenger.call(
          'RewardsController:getCandidateSubscriptionId',
        );
        dispatch(setCandidateSubscriptionId(candidateId));
      } catch (error) {
        dispatch(setCandidateSubscriptionId('error'));
      }
    };

    if (
      account &&
      (hasAccountedOptedIn === false || hasAccountedOptedIn === null) &&
      !subscriptionId
    ) {
      getCandidateId();
    }
  }, [account, hasAccountedOptedIn, dispatch, subscriptionId]);
};
