import type { RootState } from '../../../../reducers';
import {
  selectPredictConfig,
  selectPredictCryptoUpDownEnabled,
} from './predictConfig';

const createState = (remote: unknown, override?: unknown): RootState =>
  ({
    settings: { basicFunctionalityEnabled: true },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            predictConfig: override === undefined ? remote : override,
          },
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

describe('selectPredictCryptoUpDownEnabled', () => {
  it('is off for a config without the flag', () => {
    expect(selectPredictCryptoUpDownEnabled(createState(enabledConfig))).toBe(
      false,
    );
  });

  it('is on when the remote flag is on', () => {
    const state = createState({
      ...enabledConfig,
      venues: {
        ...enabledConfig.venues,
        kalshi: { enabled: true, cryptoUpDown: { enabled: true } },
      },
    });

    expect(selectPredictCryptoUpDownEnabled(state)).toBe(true);
  });

  it('is off when no config is set', () => {
    expect(selectPredictCryptoUpDownEnabled(createState(undefined))).toBe(
      false,
    );
  });
});
