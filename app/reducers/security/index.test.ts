import {
  ActionType,
  type AllowLoginWithRememberMeUpdated,
  type SetDataCollectionForMarketing,
  type SetOsAuthEnabled,
} from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';
import securityReducer from '.';

describe('securityReducer', () => {
  const initialState: Readonly<SecuritySettingsState> = {
    allowLoginWithRememberMe: false,
    dataCollectionForMarketing: null,
    isNFTAutoDetectionModalViewed: false,
    osAuthEnabled: true,
  };

  it('should set allowLoginWithRememberMe to true', () => {
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

  it('should set dataCollectionForMarketing to true', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  it('should set osAuthEnabled to true', () => {
    const action: SetOsAuthEnabled = {
      type: ActionType.SET_OS_AUTH_ENABLED,
      enabled: true,
    };

    const expectedState = {
      ...initialState,
      osAuthEnabled: true,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });
});
