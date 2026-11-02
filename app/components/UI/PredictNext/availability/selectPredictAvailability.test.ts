import type { RootState } from '../../../../reducers';
import { selectPredictEnabledFlag } from '../../Predict/selectors/featureFlags';
import { selectPredictAvailability } from './selectPredictAvailability';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.20.0'),
}));

/** `predictTradingEnabled` values, including the ones that fall back. */
const TRADING_FLAGS: [string, unknown, boolean][] = [
  ['enabled', { enabled: true, minimumVersion: '0.0.1' }, true],
  ['disabled', { enabled: false, minimumVersion: '0.0.1' }, false],
  [
    'below its minimum version',
    { enabled: true, minimumVersion: '999.0.0' },
    false,
  ],
  ['missing', undefined, true],
  ['malformed', 'yes', true],
];

const rootState = (predictTradingEnabled: unknown) =>
  ({
    settings: { basicFunctionalityEnabled: true },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { predictTradingEnabled },
        },
      },
    },
  }) as unknown as RootState;

describe('selectPredictAvailability', () => {
  it.each(TRADING_FLAGS)(
    'equals selectPredictEnabledFlag with predictTradingEnabled %s',
    (_flagCase, predictTradingEnabled, expected) => {
      const state = rootState(predictTradingEnabled);

      const result = selectPredictAvailability(state);

      expect(result).toBe(selectPredictEnabledFlag(state));
      expect(result).toBe(expected);
    },
  );
});
