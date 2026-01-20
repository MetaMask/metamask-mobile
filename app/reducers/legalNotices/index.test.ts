import legalNoticesReducer, { LegalNoticesState } from '.';
import {
  STORE_PRIVACY_POLICY_SHOWN_DATE,
  STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
  STORE_PNA25_ACKNOWLEDGED,
} from '../../actions/legalNotices';

describe('legalNoticesReducer', () => {
  const initialState: LegalNoticesState = {
    isPna25Acknowledged: false,
    newPrivacyPolicyToastClickedOrClosed: false,
    newPrivacyPolicyToastShownDate: null,
  };

  it('returns the initial state when no action is provided', () => {
    const state = legalNoticesReducer(undefined, { type: null } as never);

    expect(state).toEqual(initialState);
  });

  describe('STORE_PRIVACY_POLICY_SHOWN_DATE', () => {
    it('stores the privacy policy shown date when not previously set', () => {
      const timestamp = 1234567890;
      const action = {
        type: STORE_PRIVACY_POLICY_SHOWN_DATE,
        payload: timestamp,
      } as const;

      const state = legalNoticesReducer(initialState, action);

      expect(state.newPrivacyPolicyToastShownDate).toBe(timestamp);
    });

    it('stores timestamp of zero when provided', () => {
      const timestamp = 0;
      const action = {
        type: STORE_PRIVACY_POLICY_SHOWN_DATE,
        payload: timestamp,
      } as const;

      const state = legalNoticesReducer(initialState, action);

      expect(state.newPrivacyPolicyToastShownDate).toBe(0);
    });

    it('does not update when privacy policy shown date is already set', () => {
      const existingTimestamp = 1234567890;
      const stateWithDate = {
        ...initialState,
        newPrivacyPolicyToastShownDate: existingTimestamp,
      };
      const newTimestamp = 9876543210;
      const action = {
        type: STORE_PRIVACY_POLICY_SHOWN_DATE,
        payload: newTimestamp,
      } as const;

      const state = legalNoticesReducer(stateWithDate, action);

      expect(state.newPrivacyPolicyToastShownDate).toBe(existingTimestamp);
      expect(state).toBe(stateWithDate);
    });

    it('preserves other state properties when storing date', () => {
      const modifiedState = {
        ...initialState,
        isPna25Acknowledged: true,
        newPrivacyPolicyToastClickedOrClosed: true,
      };
      const timestamp = 1234567890;
      const action = {
        type: STORE_PRIVACY_POLICY_SHOWN_DATE,
        payload: timestamp,
      } as const;

      const state = legalNoticesReducer(modifiedState, action);

      expect(state.isPna25Acknowledged).toBe(true);
      expect(state.newPrivacyPolicyToastClickedOrClosed).toBe(true);
      expect(state.newPrivacyPolicyToastShownDate).toBe(timestamp);
    });
  });

  describe('STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED', () => {
    it('sets privacy policy clicked or closed to true', () => {
      const action = {
        type: STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
      } as const;

      const state = legalNoticesReducer(initialState, action);

      expect(state.newPrivacyPolicyToastClickedOrClosed).toBe(true);
    });

    it('preserves other state properties when setting clicked or closed', () => {
      const modifiedState = {
        ...initialState,
        isPna25Acknowledged: true,
        newPrivacyPolicyToastShownDate: 1234567890,
      };
      const action = {
        type: STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
      } as const;

      const state = legalNoticesReducer(modifiedState, action);

      expect(state.isPna25Acknowledged).toBe(true);
      expect(state.newPrivacyPolicyToastShownDate).toBe(1234567890);
      expect(state.newPrivacyPolicyToastClickedOrClosed).toBe(true);
    });

    it('keeps clicked or closed as true when already true', () => {
      const stateWithClickedOrClosed = {
        ...initialState,
        newPrivacyPolicyToastClickedOrClosed: true,
      };
      const action = {
        type: STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
      } as const;

      const state = legalNoticesReducer(stateWithClickedOrClosed, action);

      expect(state.newPrivacyPolicyToastClickedOrClosed).toBe(true);
    });
  });

  describe('STORE_PNA25_ACKNOWLEDGED', () => {
    it('sets PNA25 acknowledged to true', () => {
      const action = {
        type: STORE_PNA25_ACKNOWLEDGED,
      } as const;

      const state = legalNoticesReducer(initialState, action);

      expect(state.isPna25Acknowledged).toBe(true);
    });

    it('preserves other state properties when setting PNA25 acknowledged', () => {
      const modifiedState = {
        ...initialState,
        newPrivacyPolicyToastClickedOrClosed: true,
        newPrivacyPolicyToastShownDate: 1234567890,
      };
      const action = {
        type: STORE_PNA25_ACKNOWLEDGED,
      } as const;

      const state = legalNoticesReducer(modifiedState, action);

      expect(state.newPrivacyPolicyToastClickedOrClosed).toBe(true);
      expect(state.newPrivacyPolicyToastShownDate).toBe(1234567890);
      expect(state.isPna25Acknowledged).toBe(true);
    });

    it('keeps PNA25 acknowledged as true when already true', () => {
      const stateWithAcknowledged = {
        ...initialState,
        isPna25Acknowledged: true,
      };
      const action = {
        type: STORE_PNA25_ACKNOWLEDGED,
      } as const;

      const state = legalNoticesReducer(stateWithAcknowledged, action);

      expect(state.isPna25Acknowledged).toBe(true);
    });
  });

  describe('default case', () => {
    it('returns the current state for unknown action types', () => {
      const action = { type: 'UNKNOWN_ACTION' } as never;

      const state = legalNoticesReducer(initialState, action);

      expect(state).toBe(initialState);
    });

    it('preserves state with values for unknown action types', () => {
      const modifiedState = {
        isPna25Acknowledged: true,
        newPrivacyPolicyToastClickedOrClosed: true,
        newPrivacyPolicyToastShownDate: 1234567890,
      };
      const action = { type: 'UNKNOWN_ACTION' } as never;

      const state = legalNoticesReducer(modifiedState, action);

      expect(state).toBe(modifiedState);
    });
  });
});
