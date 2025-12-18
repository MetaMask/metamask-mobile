import {
  storePrivacyPolicyShownDate,
  storePrivacyPolicyClickedOrClosed,
  storePna25Acknowledged,
  STORE_PRIVACY_POLICY_SHOWN_DATE,
  STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
  STORE_PNA25_ACKNOWLEDGED,
} from '.';

describe('LegalNotices actions', () => {
  describe('storePrivacyPolicyShownDate', () => {
    it('creates an action to store privacy policy shown date', () => {
      const timestamp = 1234567890;

      const action = storePrivacyPolicyShownDate(timestamp);

      expect(action).toEqual({
        type: STORE_PRIVACY_POLICY_SHOWN_DATE,
        payload: timestamp,
      });
    });

    it('creates an action with zero timestamp', () => {
      const timestamp = 0;

      const action = storePrivacyPolicyShownDate(timestamp);

      expect(action).toEqual({
        type: STORE_PRIVACY_POLICY_SHOWN_DATE,
        payload: 0,
      });
    });

    it('creates an action with Date.now() timestamp', () => {
      const timestamp = Date.now();

      const action = storePrivacyPolicyShownDate(timestamp);

      expect(action).toEqual({
        type: STORE_PRIVACY_POLICY_SHOWN_DATE,
        payload: timestamp,
      });
    });
  });

  describe('storePrivacyPolicyClickedOrClosed', () => {
    it('creates an action to store privacy policy clicked or closed', () => {
      const action = storePrivacyPolicyClickedOrClosed();

      expect(action).toEqual({
        type: STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
      });
    });
  });

  describe('storePna25Acknowledged', () => {
    it('creates an action to store PNA25 acknowledged', () => {
      const action = storePna25Acknowledged();

      expect(action).toEqual({
        type: STORE_PNA25_ACKNOWLEDGED,
      });
    });
  });
});
