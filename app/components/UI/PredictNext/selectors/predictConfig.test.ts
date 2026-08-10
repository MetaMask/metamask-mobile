import type { RootState } from '../../../../reducers';
import { selectPredictConfig } from './predictConfig';

const createState = (remote: unknown, override?: unknown): RootState =>
  ({
    settings: { basicFunctionalityEnabled: true },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { predictConfig: remote },
          localOverrides:
            override === undefined ? {} : { predictConfig: override },
        },
      },
    },
  }) as unknown as RootState;

const enabledConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: false },
};

describe('selectPredictConfig', () => {
  it('reads a processed remote config', () => {
    const state = createState(enabledConfig);

    const result = selectPredictConfig(state);

    expect(result).toEqual(enabledConfig);
  });

  it('prefers a local override', () => {
    const override = {
      ...enabledConfig,
      venues: {
        polymarket: { enabled: true },
        kalshi: { enabled: false },
      },
    };
    const state = createState(enabledConfig, override);

    const result = selectPredictConfig(state);

    expect(result).toEqual(override);
  });
});
