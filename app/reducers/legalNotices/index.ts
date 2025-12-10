import {
  STORE_PRIVACY_POLICY_SHOWN_DATE,
  STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
  STORE_PNA25_ACKNOWLEDGED,
  LegalNoticesActionTypes,
} from '../../actions/legalNotices';

export interface LegalNoticesState {
  isPna25Acknowledged: boolean;
  newPrivacyPolicyToastClickedOrClosed: boolean;
  newPrivacyPolicyToastShownDate: number | null;
}

const currentDate = new Date(Date.now());
export const newPrivacyPolicyDate = new Date('2024-06-18T12:00:00Z');
export const isPastPrivacyPolicyDate = currentDate >= newPrivacyPolicyDate;

const initialState: LegalNoticesState = {
  isPna25Acknowledged: false,
  newPrivacyPolicyToastClickedOrClosed: false,
  newPrivacyPolicyToastShownDate: null,
};

const legalNoticesReducer = (
  // eslint-disable-next-line @typescript-eslint/default-param-last
  state = initialState,
  action: LegalNoticesActionTypes,
): LegalNoticesState => {
  switch (action.type) {
    case STORE_PRIVACY_POLICY_SHOWN_DATE: {
      if (state.newPrivacyPolicyToastShownDate !== null) {
        return state;
      }

      return {
        ...state,
        newPrivacyPolicyToastShownDate: action.payload,
      };
    }

    case STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED: {
      return { ...state, newPrivacyPolicyToastClickedOrClosed: true };
    }

    case STORE_PNA25_ACKNOWLEDGED: {
      return { ...state, isPna25Acknowledged: true };
    }

    default:
      return state;
  }
};

export default legalNoticesReducer;
