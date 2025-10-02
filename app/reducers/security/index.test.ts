import { ActionType } from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';
import securityReducer from '.';

describe('securityReducer', () => {
  const initialState: Readonly<SecuritySettingsState> = {
    allowLoginWithRememberMe: false,
    dataCollectionForMarketing: null,
    isNFTAutoDetectionModalViewed: false,
    shouldShowConsentSheet: true,
    dataSharingPreference: null,
  };

  it('should set allowLoginWithRememberMe to true', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const action: any = {
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
    const action: any = {
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
});
