import {
  selectIsBackupAndSyncEnabled,
  selectIsBackupAndSyncUpdateLoading,
  selectIsAccountSyncingEnabled,
  selectIsContactSyncingEnabled,
  selectIsSignedIn,
  selectCanonicalProfileId,
  selectNeedsProfilePairing,
} from './index';
import { RootState } from '../../reducers';

describe('Notification Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        AuthenticationController: {
          isSignedIn: true,
          needsProfilePairing: false,
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

  it('selectCanonicalProfileId returns the canonical id from the first session profile', () => {
    const stateWithSession = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            srpSessionData: {
              entropySourceId1: {
                profile: {
                  identifierId: 'identifierId',
                  profileId: 'profileId',
                  canonicalProfileId: 'canonicalProfileId',
                  metaMetricsId: 'metaMetricsId',
                },
              },
            },
          },
        },
      },
    } as unknown as RootState;

    expect(selectCanonicalProfileId(stateWithSession)).toBe(
      'canonicalProfileId',
    );
  });

  it('selectCanonicalProfileId returns undefined when there is no session profile', () => {
    expect(selectCanonicalProfileId(mockState)).toBeUndefined();
  });

  it('selectNeedsProfilePairing returns the persisted value when present', () => {
    expect(selectNeedsProfilePairing(mockState)).toBe(false);
  });

  it('selectNeedsProfilePairing defaults to true when the field is absent', () => {
    const stateWithoutField = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
          },
        },
      },
    } as unknown as RootState;

    expect(selectNeedsProfilePairing(stateWithoutField)).toBe(true);
  });
});
