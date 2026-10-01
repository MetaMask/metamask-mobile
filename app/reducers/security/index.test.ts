import {
  ActionType,
  type AllowLoginWithRememberMeUpdated,
  type SetDataCollectionForMarketing,
  type SetOsAuthEnabled,
  type SetShouldShowConsentSheet,
  type SetDataSharingPreference,
} from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';
import securityReducer from '.';

describe('securityReducer', () => {
  const initialState: Readonly<SecuritySettingsState> = {
    allowLoginWithRememberMe: false,
    dataCollectionForMarketing: null,
    isNFTAutoDetectionModalViewed: false,
    osAuthEnabled: true,
    shouldShowConsentSheet: true,
    dataSharingPreference: null,
  };

  it('sets allowLoginWithRememberMe to true', () => {
    const action: AllowLoginWithRememberMeUpdated = {
      type: ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME,
      enabled: true,
    };

    const expectedState = {
      ...initialState,
      allowLoginWithRememberMe: true,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('sets dataCollectionForMarketing to true', () => {
    const action: SetDataCollectionForMarketing = {
      type: ActionType.SET_DATA_COLLECTION_FOR_MARKETING,
      enabled: true,
    };

    const expectedState = {
      ...initialState,
      dataCollectionForMarketing: true,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('sets osAuthEnabled to false', () => {
    const action: SetOsAuthEnabled = {
      type: ActionType.SET_OS_AUTH_ENABLED,
      enabled: false,
    };

    const expectedState = {
      ...initialState,
      osAuthEnabled: false,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('sets shouldShowConsentSheet to false', () => {
    const action: SetShouldShowConsentSheet = {
      type: ActionType.SET_SHOULD_SHOW_CONSENT_SHEET,
      shouldShow: false,
    };

    const expectedState = {
      ...initialState,
      shouldShowConsentSheet: false,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('sets dataSharingPreference to false', () => {
    const action: SetDataSharingPreference = {
      type: ActionType.SET_DATA_SHARING_PREFERENCE,
      preference: false,
    };

    const expectedState = {
      ...initialState,
      dataSharingPreference: false,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });
});
