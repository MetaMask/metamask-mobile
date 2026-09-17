import {
  selectIsBackupAndSyncEnabled,
  selectIsBackupAndSyncUpdateLoading,
  selectIsAccountSyncingEnabled,
  selectIsContactSyncingEnabled,
  selectIsSignedIn,
  selectCanonicalProfileId,
  selectNeedsProfilePairing,
  selectNeedsSocialPairing,
} from './index';
import { RootState } from '../../reducers';
import ExtendedKeyringTypes from '../../constants/keyringTypes';

const hdKeyring = (id: string) => ({
  type: ExtendedKeyringTypes.hd,
  accounts: [],
  metadata: { id, name: '' },
});

describe('Notification Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        AuthenticationController: {
          isSignedIn: true,
          needsProfilePairing: false,
        },
        KeyringController: {
          isUnlocked: false,
          keyrings: [],
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

  it('selectCanonicalProfileId returns the canonical id for the primary HD keyring', () => {
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
          KeyringController: {
            isUnlocked: true,
            keyrings: [hdKeyring('entropySourceId1')],
          },
        },
      },
    } as unknown as RootState;

    expect(selectCanonicalProfileId(stateWithSession)).toBe(
      'canonicalProfileId',
    );
  });

  it('selectCanonicalProfileId returns the primary SRP session when a stale first entry remains', () => {
    const stateWithStaleFirstEntry = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            srpSessionData: {
              'srp-1-entropy': {
                profile: { canonicalProfileId: 'canonical-srp-1' },
              },
              'srp-2-entropy': {
                profile: { canonicalProfileId: 'canonical-srp-2' },
              },
            },
          },
          KeyringController: {
            isUnlocked: true,
            keyrings: [hdKeyring('srp-2-entropy')],
          },
        },
      },
    } as unknown as RootState;

    expect(selectCanonicalProfileId(stateWithStaleFirstEntry)).toBe(
      'canonical-srp-2',
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

  it('selectNeedsSocialPairing returns the persisted value when present', () => {
    const stateWithField = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            needsSocialPairing: false,
          },
        },
      },
    } as unknown as RootState;

    expect(selectNeedsSocialPairing(stateWithField)).toBe(false);
  });

  it('selectNeedsSocialPairing defaults to true when the field is absent', () => {
    expect(selectNeedsSocialPairing(mockState)).toBe(true);
  });
});
