export const STORE_PRIVACY_POLICY_SHOWN_DATE =
  'STORE_PRIVACY_POLICY_SHOWN_DATE';
export const STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED =
  'STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED';
export const STORE_PNA25_ACKNOWLEDGED = 'STORE_PNA25_ACKNOWLEDGED';

interface StorePrivacyPolicyShownDateAction {
  type: typeof STORE_PRIVACY_POLICY_SHOWN_DATE;
  payload: number;
}

interface StorePrivacyPolicyClickedOrClosedAction {
  type: typeof STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED;
}

interface StorePna25AcknowledgedAction {
  type: typeof STORE_PNA25_ACKNOWLEDGED;
}

export type LegalNoticesActionTypes =
  | StorePrivacyPolicyShownDateAction
  | StorePrivacyPolicyClickedOrClosedAction
  | StorePna25AcknowledgedAction;

export function storePrivacyPolicyShownDate(
  timestamp: number,
): StorePrivacyPolicyShownDateAction {
  return {
    type: STORE_PRIVACY_POLICY_SHOWN_DATE,
    payload: timestamp,
  };
}

export function storePrivacyPolicyClickedOrClosed(): StorePrivacyPolicyClickedOrClosedAction {
  return {
    type: STORE_PRIVACY_POLICY_CLICKED_OR_CLOSED,
  };
}

export function storePna25Acknowledged(): StorePna25AcknowledgedAction {
  return {
    type: STORE_PNA25_ACKNOWLEDGED,
  };
}
