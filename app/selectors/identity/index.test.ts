import {
  selectIsBackupAndSyncEnabled,
  selectIsBackupAndSyncUpdateLoading,
  selectIsAccountSyncingEnabled,
  selectIsAccountSyncingReadyToBeDispatched,
  selectIsContactSyncingEnabled,
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
          isBackupAndSyncEnabled: true,
          isAccountSyncingEnabled: true,
          isBackupAndSyncUpdateLoading: false,
          isAccountSyncingReadyToBeDispatched: false,
        },
      },
    },
  } as unknown as RootState;

  it('selectIsBackupAndSyncEnabled returns correct value', () => {
    expect(selectIsBackupAndSyncEnabled(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isBackupAndSyncEnabled,
    );
  });

  it('selectIsBackupAndSyncUpdateLoading returns correct value', () => {
    expect(selectIsBackupAndSyncUpdateLoading(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isBackupAndSyncUpdateLoading,
    );
  });

  it('selectIsAccountSyncingEnabled returns correct value', () => {
    expect(selectIsAccountSyncingEnabled(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isAccountSyncingEnabled,
    );
  });

  it('selectIsAccountSyncingReadyToBeDispatched returns correct value', () => {
    expect(selectIsAccountSyncingReadyToBeDispatched(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isAccountSyncingReadyToBeDispatched,
    );
  });

  it('selectIsContactSyncingEnabled returns correct value', () => {
    expect(selectIsContactSyncingEnabled(mockState)).toEqual(
      mockState.engine.backgroundState.UserStorageController
        .isContactSyncingEnabled,
    );
  });

  it('selectIsSignedIn returns correct value', () => {
    expect(selectIsSignedIn(mockState)).toEqual(
      mockState.engine.backgroundState.AuthenticationController.isSignedIn,
    );
  });
});
