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
          srpSessionData: {
            'entropy-1': {
              profile: {
                profileId: 'per-srp-profile-id',
                canonicalProfileId: 'canonical-profile-id',
                identifierId: 'id',
                metaMetricsId: 'mm-id',
              },
              token: {
                accessToken: 'token',
                expiresIn: 3600,
                obtainedAt: 1,
              },
            },
          },
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

  it('selectCanonicalProfileId returns the canonical profile ID', () => {
    expect(selectCanonicalProfileId(mockState)).toBe('canonical-profile-id');
  });

  it('selectCanonicalProfileId returns undefined when session data is missing', () => {
    const stateWithoutSession = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
          },
        },
      },
    } as unknown as RootState;

    expect(selectCanonicalProfileId(stateWithoutSession)).toBeUndefined();
  });

  it('selectCanonicalProfileId returns undefined for an empty canonicalProfileId', () => {
    const stateWithEmptyCanonical = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            srpSessionData: {
              'entropy-1': {
                profile: {
                  profileId: 'per-srp-profile-id',
                  canonicalProfileId: '',
                  identifierId: 'id',
                  metaMetricsId: 'mm-id',
                },
                token: {
                  accessToken: 'token',
                  expiresIn: 3600,
                  obtainedAt: 1,
                },
              },
            },
          },
        },
      },
    } as unknown as RootState;

    expect(selectCanonicalProfileId(stateWithEmptyCanonical)).toBeUndefined();
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
