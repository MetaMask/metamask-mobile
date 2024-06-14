import { RootState } from '..';
import { Action } from 'redux';
import ACTIONS from './types';

const currentDate = new Date(Date.now());
const newPrivacyPolicyDate = new Date('2024-06-14T00:00:00Z');
export const isPastPrivacyPolicyDate = currentDate >= newPrivacyPolicyDate;

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

export const shouldShowNewPrivacyToastSelector = (
  state: RootState,
): boolean => {
  const {
    newPrivacyPolicyToastShownDate,
    newPrivacyPolicyToastClickedOrClosed,
  } = state.legalNotices;

  if (newPrivacyPolicyToastClickedOrClosed) return false;

  const shownDate = new Date(newPrivacyPolicyToastShownDate);

  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const isRecent =
    currentDate.getTime() - shownDate.getTime() < oneDayInMilliseconds;

  return (
    currentDate.getTime() >= newPrivacyPolicyDate.getTime() &&
    (!newPrivacyPolicyToastShownDate ||
      (isRecent && !newPrivacyPolicyToastClickedOrClosed))
  );
};

export interface LegalNoticesAction extends Action {
  newPrivacyPolicyToastShownDate: boolean;
  payload: number;
}

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
