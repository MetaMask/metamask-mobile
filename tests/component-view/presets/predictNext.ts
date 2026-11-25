import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import { createStateFixture, type StateFixtureBuilder } from '../stateFixture';

/** The synthetic keyring/session pair Home's readiness gate resolves. */
export const PREDICT_NEXT_ENTROPY_SOURCE_ID = 'predict-next-hd-keyring';
export const PREDICT_NEXT_CANONICAL_PROFILE_ID =
  'canonical-profile-predict-next';
export const PREDICT_NEXT_ACCOUNT_ADDRESS =
  '0x0000000000000000000000000000000000000001';

/**
 * Signed in, unlocked, and backed by the primary HD keyring's session profile.
 * The keyring id and the `srpSessionData` key must match: the canonical profile
 * selector resolves identity from the pair, not from a session alias.
 */
const withReadinessIdentity = (
  fixture: StateFixtureBuilder,
): StateFixtureBuilder =>
  fixture.withOverrides({
    engine: {
      backgroundState: {
        KeyringController: {
          isUnlocked: true,
          keyrings: [
            {
              type: ExtendedKeyringTypes.hd,
              accounts: [PREDICT_NEXT_ACCOUNT_ADDRESS],
              metadata: {
                id: PREDICT_NEXT_ENTROPY_SOURCE_ID,
                name: 'Wallet 1',
              },
            },
          ],
        },
        AuthenticationController: {
          isSignedIn: true,
          srpSessionData: {
            [PREDICT_NEXT_ENTROPY_SOURCE_ID]: {
              profile: {
                identifierId: 'predict-next-identifier',
                profileId: 'predict-next-profile',
                canonicalProfileId: PREDICT_NEXT_CANONICAL_PROFILE_ID,
                metaMetricsId: 'predict-next-metametrics',
              },
            },
          },
        },
      },
    },
  });

export const initialStatePredictNext = (
  privacyMode = false,
): StateFixtureBuilder =>
  withReadinessIdentity(
    createStateFixture()
      .withMinimalAccounts(PREDICT_NEXT_ACCOUNT_ADDRESS)
      .withMinimalMainnetNetwork()
      .withMinimalKeyringController()
      .withPreferences({ privacyMode })
      .withRemoteFeatureFlags({
        predictTradingEnabled: {
          enabled: true,
          featureVersion: '1.0.0',
          minimumVersion: '0.0.1',
        },
        predictConfig: {
          enabled: true,
          venues: {
            polymarket: { enabled: false },
            kalshi: { enabled: true },
          },
          venueSelection: { enabled: false },
        },
      }),
  );

/**
 * The same state without a canonical identity: signed out, locked, and with
 * no session profile. Used by journeys that pin "no HTTP without identity".
 */
export const initialStatePredictNextWithoutIdentity = (
  privacyMode = false,
): StateFixtureBuilder =>
  createStateFixture()
    .withMinimalAccounts(PREDICT_NEXT_ACCOUNT_ADDRESS)
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withPreferences({ privacyMode })
    .withRemoteFeatureFlags({
      predictTradingEnabled: {
        enabled: true,
        featureVersion: '1.0.0',
        minimumVersion: '0.0.1',
      },
      predictConfig: {
        enabled: true,
        venues: {
          polymarket: { enabled: false },
          kalshi: { enabled: true },
        },
        venueSelection: { enabled: false },
      },
    });
