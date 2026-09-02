import { Linking } from 'react-native';
import {
  __resetPerformanceProfilerBridgeForTests,
  PROFILER_DEEPLINK_DEDUPE_WINDOW_MS,
  registerPerformanceProfilerBridge,
} from './performanceProfilerBridge';
import * as appProfiling from './appProfiling';

jest.mock('./appProfiling', () => ({
  isPerformanceProfilingEnabled: true,
  startAppProfiling: jest.fn().mockResolvedValue(true),
  stopAppProfiling: jest.fn().mockResolvedValue('/tmp/profile.cpuprofile'),
}));

jest.mock('../SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

describe('performanceProfilerBridge', () => {
  let urlHandler: ((event: { url: string }) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __resetPerformanceProfilerBridgeForTests();
    urlHandler = undefined;

    jest.spyOn(Linking, 'addEventListener').mockImplementation(((
      _event,
      handler,
    ) => {
      urlHandler = handler as (event: { url: string }) => void;
      return { remove: jest.fn() } as { remove: () => void };
    }) as typeof Linking.addEventListener);

    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('registers a Linking handler and starts profiling on start deeplink', async () => {
    registerPerformanceProfilerBridge();

    expect(Linking.addEventListener).toHaveBeenCalledWith(
      'url',
      expect.any(Function),
    );

    await urlHandler?.({ url: 'metamask://e2e/profiler/start' });

    expect(appProfiling.startAppProfiling).toHaveBeenCalledTimes(1);
  });

  it('stops profiling on stop deeplink', async () => {
    registerPerformanceProfilerBridge();

    await urlHandler?.({ url: 'e2e://profiler/stop' });

    expect(appProfiling.stopAppProfiling).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate start deeplinks within the dedupe window', async () => {
    registerPerformanceProfilerBridge();

    await urlHandler?.({ url: 'metamask://e2e/profiler/start' });
    await urlHandler?.({ url: 'metamask://e2e/profiler/start' });

    expect(appProfiling.startAppProfiling).toHaveBeenCalledTimes(1);
  });

  it('allows a second start/stop after the dedupe window expires', async () => {
    registerPerformanceProfilerBridge();

    await urlHandler?.({ url: 'metamask://e2e/profiler/start' });
    await urlHandler?.({ url: 'metamask://e2e/profiler/stop' });

    jest.advanceTimersByTime(PROFILER_DEEPLINK_DEDUPE_WINDOW_MS);

    await urlHandler?.({ url: 'metamask://e2e/profiler/start' });
    await urlHandler?.({ url: 'metamask://e2e/profiler/stop' });

    expect(appProfiling.startAppProfiling).toHaveBeenCalledTimes(2);
    expect(appProfiling.stopAppProfiling).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated deeplinks', async () => {
    registerPerformanceProfilerBridge();

    await urlHandler?.({ url: 'metamask://e2e/perps/push-price' });

    expect(appProfiling.startAppProfiling).not.toHaveBeenCalled();
    expect(appProfiling.stopAppProfiling).not.toHaveBeenCalled();
  });

  it('registers only once', () => {
    registerPerformanceProfilerBridge();
    registerPerformanceProfilerBridge();

    expect(Linking.addEventListener).toHaveBeenCalledTimes(1);
  });
});
