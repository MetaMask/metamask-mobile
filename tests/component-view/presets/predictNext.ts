import { createStateFixture } from '../stateFixture';

export const initialStatePredictNext = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withOverrides({
      engine: {
        backgroundState: {
          PredictSessionService: {
            accountReadiness: null,
            requestStatus: 'idle',
          },
        },
      },
    })
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
