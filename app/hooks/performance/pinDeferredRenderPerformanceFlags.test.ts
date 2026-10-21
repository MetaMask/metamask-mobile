import Engine from '../../core/Engine';
import { PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID } from './deferredRenderPerformanceIds';
import {
  PERPS_ADVANCED_CHART_PRODUCTION_DEFAULT,
  _resetDeferredRenderFlagPinForTesting,
  pinPerpsAdvancedChartProductionDefault,
} from './pinDeferredRenderPerformanceFlags';
import {
  getScreenTtc,
  _resetScreenTtcRegistryForTesting,
  _setScreenTtcProbeEnabledForTesting,
} from './screenTtcRegistry';

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RemoteFeatureFlagController: {
        setFlagOverride: jest.fn(),
      },
    },
  },
}));

jest.mock('../../components/UI/Perps/selectors/featureFlags', () => ({
  PERPS_ADVANCED_CHART_ENABLED_FLAG_KEY: 'perpsAdvancedChartEnabledV2',
}));

const setFlagOverride = Engine.context.RemoteFeatureFlagController
  .setFlagOverride as jest.Mock;

describe('pinPerpsAdvancedChartProductionDefault', () => {
  const originalPerformanceTest = process.env.IS_PERFORMANCE_TEST;

  beforeEach(() => {
    _resetDeferredRenderFlagPinForTesting();
    setFlagOverride.mockClear();
    delete process.env.IS_PERFORMANCE_TEST;
  });

  afterEach(() => {
    if (originalPerformanceTest === undefined) {
      delete process.env.IS_PERFORMANCE_TEST;
    } else {
      process.env.IS_PERFORMANCE_TEST = originalPerformanceTest;
    }
  });

  it('does not override the flag outside a performance build', () => {
    // Babel inlines IS_PERFORMANCE_TEST at build time. A runtime assignment
    // does not turn a release or smoke bundle into a performance build.
    process.env.IS_PERFORMANCE_TEST = 'true';

    pinPerpsAdvancedChartProductionDefault();

    expect(setFlagOverride).not.toHaveBeenCalled();
  });

  it('pins the registry production default once on a performance build', () => {
    pinPerpsAdvancedChartProductionDefault(true);
    pinPerpsAdvancedChartProductionDefault(true);

    expect(setFlagOverride).toHaveBeenCalledTimes(1);
    expect(setFlagOverride).toHaveBeenCalledWith(
      'perpsAdvancedChartEnabledV2',
      PERPS_ADVANCED_CHART_PRODUCTION_DEFAULT,
    );
    expect(PERPS_ADVANCED_CHART_PRODUCTION_DEFAULT).toEqual({
      enabled: true,
      minimumVersion: '8.3.0',
    });
  });

  it('records a pin error when the remote flag controller is missing', () => {
    const context = Engine.context as unknown as {
      RemoteFeatureFlagController?: {
        setFlagOverride: jest.Mock;
      };
    };
    const controller = context.RemoteFeatureFlagController;
    context.RemoteFeatureFlagController = undefined;
    _resetScreenTtcRegistryForTesting();
    _setScreenTtcProbeEnabledForTesting(true);

    try {
      pinPerpsAdvancedChartProductionDefault(true);

      expect(setFlagOverride).not.toHaveBeenCalled();
      expect(
        getScreenTtc(PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID)?.contentState,
      ).toBe('error');
    } finally {
      context.RemoteFeatureFlagController = controller;
      _setScreenTtcProbeEnabledForTesting(undefined);
      _resetScreenTtcRegistryForTesting();
      _resetDeferredRenderFlagPinForTesting();
    }
  });
});
