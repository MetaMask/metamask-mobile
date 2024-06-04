import { ActionType } from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';
import securityReducer from '.';

describe('securityReducer', () => {
  const initialState: Readonly<SecuritySettingsState> = {
    allowLoginWithRememberMe: false,
    automaticSecurityChecksEnabled: false,
    hasUserSelectedAutomaticSecurityCheckOption: false,
    isAutomaticSecurityChecksModalOpen: false,
    dataCollectionForMarketing: null,
  };

  it('should set allowLoginWithRememberMe to true', () => {
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

  it('should set automaticSecurityChecksEnabled to true', () => {
    const action: any = {
      type: ActionType.SET_AUTOMATIC_SECURITY_CHECKS,
      enabled: true,
    };

    const expectedState = {
      ...initialState,
      automaticSecurityChecksEnabled: true,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should set hasUserSelectedAutomaticSecurityCheckOption to true', () => {
    const action: any = {
      type: ActionType.USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION,
      selected: true,
    };

    const expectedState = {
      ...initialState,
      hasUserSelectedAutomaticSecurityCheckOption: true,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should set isAutomaticSecurityChecksModalOpen to true', () => {
    const action: any = {
      type: ActionType.SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN,
      open: true,
    };

    const expectedState = {
      ...initialState,
      isAutomaticSecurityChecksModalOpen: true,
    };

    const newState = securityReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('should set dataCollectionForMarketing to true', () => {
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
