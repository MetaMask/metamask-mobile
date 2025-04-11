import { RootState } from '..';
import { Action } from 'redux';
import ACTIONS from './types';
import { selectRemoteFeatureFlags } from '../../selectors/featureFlagController';

const initialState = {
  newPrivacyPolicyToastClickedOrClosed: false,
  newPrivacyPolicyToastShownDate: null,
};

export const storePrivacyPolicyShownDate = (timestamp: number) => ({
  type: ACTIONS.STORE_PRIVACY_POLICY_SHOWN_DATE,
  payload: timestamp,
});

export const storePrivacyPolicyClickedOrClosed = () => ({
  type: ACTIONS.STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
});

// New selector for privacy policy feature flag
export const selectPrivacyPolicyUpdateFeatureFlag = (state: RootState): string => {
  const remoteFeatureFlags = selectRemoteFeatureFlags(state);
  const policyValue = String(remoteFeatureFlags?.transactionsPrivacyPolicyUpdate || '');

  if (policyValue === 'active_update') {
    return '2025-04-01T12:00:00Z'; // A date in the past
  }

  return policyValue;
};

export const shouldShowNewPrivacyToastSelector = (state: RootState): boolean => {
  const {
    newPrivacyPolicyToastShownDate,
    newPrivacyPolicyToastClickedOrClosed,
  } = state.legalNotices;

  // Get the feature flag value
  const policyUpdateDate = selectPrivacyPolicyUpdateFeatureFlag(state);

  // If feature flag is not set or empty, don't show toast
  if (!policyUpdateDate) return false;

  // If toast was already clicked or closed, don't show it again
  if (newPrivacyPolicyToastClickedOrClosed) return false;

  const currentDate = new Date();
  const policyDate = new Date(policyUpdateDate);

  // Check if current date is after policy update date
  const isPastPolicyDate = currentDate >= policyDate;

  // Check if toast was shown recently (within 24 hours)
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const isRecent = newPrivacyPolicyToastShownDate
    ? currentDate.getTime() - newPrivacyPolicyToastShownDate < oneDayInMilliseconds
    : false;

  return (
    isPastPolicyDate &&
    (!newPrivacyPolicyToastShownDate || isRecent)
  );
};

export interface LegalNoticesAction extends Action {
  newPrivacyPolicyToastShownDate: boolean;
  payload: number;
}

export const isPastPrivacyPolicyDate = (state: RootState): boolean => {
  const policyUpdateDate = selectPrivacyPolicyUpdateFeatureFlag(state);
  if (!policyUpdateDate) return false;

  const currentDate = new Date();
  const policyDate = new Date(policyUpdateDate);

  return currentDate >= policyDate;
};

const legalNoticesReducer = (
  state = initialState,
  action: LegalNoticesAction = {
    type: '',
    newPrivacyPolicyToastShownDate: false,
    payload: 0,
  },
) => {
  switch (action.type) {
    case ACTIONS.STORE_PRIVACY_POLICY_SHOWN_DATE: {
      if (state.newPrivacyPolicyToastShownDate !== null) {
        return state;
      }

      return {
        ...state,
        newPrivacyPolicyToastShownDate: action.payload,
      };
    }

    case ACTIONS.STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED: {
      return { ...state, newPrivacyPolicyToastClickedOrClosed: true };
    }

    default:
      return state;
  }
};

export default legalNoticesReducer;
