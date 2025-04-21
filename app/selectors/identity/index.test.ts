import {
  selectIsProfileSyncingEnabled,
  selectIsProfileSyncingUpdateLoading,
  selectIsAccountSyncingReadyToBeDispatched,
  selectIsSignedIn,
} from './index';
import { RootState } from '../../reducers';

describe('Notification Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        AuthenticationController: {
          isSignedIn: true,
        },
        UserStorageController: {
          isProfileSyncingEnabled: true,
          isProfileSyncingUpdateLoading: false,
          isAccountSyncingReadyToBeDispatched: false,
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

  it('selectIsAccountSyncingReadyToBeDispatched returns correct value', () => {
    expect(selectIsAccountSyncingReadyToBeDispatched(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isAccountSyncingReadyToBeDispatched,
    );
  });

  it('selectIsSignedIn returns correct value', () => {
    expect(selectIsSignedIn(mockState)).toEqual(
      mockState.engine.backgroundState.AuthenticationController.isSignedIn,
    );
  });
});
