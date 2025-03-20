import {
  selectIsProfileSyncingEnabled,
  selectIsProfileSyncingUpdateLoading,
  selectIsSignedIn,
  selectSessionData,
} from './index';
import { RootState } from '../../reducers';

describe('Notification Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        AuthenticationController: {
          isSignedIn: true,
          sessionData: {
            userId: '12345',
            token: 'abcdef',
          },
        },
        UserStorageController: {
          isProfileSyncingEnabled: true,
          isProfileSyncingUpdateLoading: false,
        },
      },
    },
  } as unknown as RootState;

  it('selectIsProfileSyncingEnabled returns correct value', () => {
    expect(selectIsProfileSyncingEnabled(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isProfileSyncingEnabled,
    );
  });

  it('selectIsProfileSyncingUpdateLoading returns correct value', () => {
    expect(selectIsProfileSyncingUpdateLoading(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isProfileSyncingUpdateLoading,
    );
  });

  it('selectIsSignedIn returns correct value', () => {
    expect(selectIsSignedIn(mockState)).toEqual(
      mockState.engine.backgroundState.AuthenticationController.isSignedIn,
    );
  });

  it('selectSessionData returns correct value', () => {
    expect(selectSessionData(mockState)).toEqual(
      mockState.engine.backgroundState.AuthenticationController.sessionData,
    );
  });
});
