import {
  createHomepagePerformanceDemand,
  getHomepagePerpsDiskCacheAgeMs,
  handleHomepagePerformanceAppStateChange,
  isHomepagePerpsDeliveryFreshForDemand,
  markHomepagePerpsAccountSwitch,
  markHomepagePerpsDiskCacheHydrated,
  markHomepagePerpsNavigateReturn,
  markHomepagePerpsNetworkRecovery,
  recordHomepagePerpsErrorFrame,
  recordHomepagePerpsVisibleFrame,
  resetHomepagePerformanceProbeForTests,
  type HomepagePerformanceDemand,
  type HomepagePerpsDeliveryMetadata,
} from './homepagePerformanceProbe';

jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn() },
}));

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: { now: jest.fn(() => 0) },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => `trace-${Math.random()}`),
}));

jest.mock('@metamask/perps-controller', () => ({
  PERPS_CONSTANTS: { ConnectionGracePeriodMs: 20_000 },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    HomepagePerpsTimeToFirstVisibleContent:
      'Homepage Perps Time To First Visible Content',
    HomepagePerpsTimeToFreshVisibleData:
      'Homepage Perps Time To Fresh Visible Data',
    HomepagePerpsSocketToVisible: 'Homepage Perps Socket To Visible',
    HomepagePerpsCachedToFreshVisible: 'Homepage Perps Cached To Fresh Visible',
  },
  TraceOperation: {
    PerpsHomepagePerformance: 'perps.homepage.performance',
  },
}));

const { trace: mockTrace, endTrace: mockEndTrace } = jest.requireMock(
  '../../../../util/trace',
);
const mockPerformanceNow = jest.requireMock('react-native-performance').default
  .now as jest.Mock;

const createDemand = (): HomepagePerformanceDemand => ({
  demandId: 'demand-1',
  startedAtMonotonicMs: 100,
  lifecycleStartedAtMonotonicMs: 50,
  lifecycle: 'cold_disk_cache',
  firstVisibleRecorded: false,
  firstFreshVisibleRecorded: false,
  recordedFreshPipelineStreams: new Set(),
});

const createDelivery = (
  stream: 'positions' | 'orders',
  source: 'disk_cache' | 'fresh_socket',
  receivedAtMonotonicMs: number,
): HomepagePerpsDeliveryMetadata => ({
  deliveryId: `${stream}-${source}-${receivedAtMonotonicMs}`,
  stream,
  source,
  itemCount: stream === 'positions' ? 1 : 0,
  receivedAtMonotonicMs,
  subscriberDeliveredAtMonotonicMs: receivedAtMonotonicMs + 10,
  dataAgeMs: source === 'disk_cache' ? 5_000 : 0,
  lifecycle: 'cold_disk_cache',
  accountGeneration: 0,
});

describe('homepage visible performance telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHomepagePerformanceProbeForTests();
    mockPerformanceNow.mockReturnValue(0);
    jest.spyOn(Date, 'now').mockReturnValue(100_000);
  });

  it('classifies disk cache from the oldest aggregated entry', () => {
    markHomepagePerpsDiskCacheHydrated(
      JSON.stringify({
        entries: [
          { timestamp: 95_000, positions: [], orders: [] },
          { timestamp: 90_000, positions: [], orders: [] },
        ],
      }),
    );

    expect(getHomepagePerpsDiskCacheAgeMs()).toBe(10_000);
    expect(createHomepagePerformanceDemand().lifecycle).toBe('cold_disk_cache');
  });

  it('uses a newer navigation lifecycle when it occurs before the first demand', () => {
    markHomepagePerpsDiskCacheHydrated(
      JSON.stringify({ entries: [{ timestamp: 95_000 }] }),
    );
    markHomepagePerpsNavigateReturn();

    expect(createHomepagePerformanceDemand().lifecycle).toBe('navigate_return');
  });

  it.each([
    [5_000, 'background_short'],
    [25_000, 'background_reconnect'],
  ] as const)(
    'classifies a %i ms background interval as %s',
    (foregroundAt, expectedLifecycle) => {
      mockPerformanceNow.mockReturnValueOnce(0);
      handleHomepagePerformanceAppStateChange('background');
      mockPerformanceNow.mockReturnValue(foregroundAt);
      handleHomepagePerformanceAppStateChange('active');

      expect(createHomepagePerformanceDemand().lifecycle).toBe(
        expectedLifecycle,
      );
    },
  );

  it('labels account switch and network recovery demands independently', () => {
    markHomepagePerpsAccountSwitch();
    expect(createHomepagePerformanceDemand().lifecycle).toBe('account_switch');

    markHomepagePerpsNetworkRecovery();
    expect(createHomepagePerformanceDemand().lifecycle).toBe(
      'network_recovery',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records cache visibility, fresh visibility, and convergence at frame checkpoints', () => {
    const demand = createDemand();

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [
        createDelivery('positions', 'disk_cache', 120),
        createDelivery('orders', 'disk_cache', 130),
      ],
      contentVariant: 'positions',
      reactCommitAtMonotonicMs: 180,
      frameCheckpointAtMonotonicMs: 200,
    });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Homepage Perps Time To First Visible Content',
        op: 'perps.homepage.performance',
        startTime: 99_900,
        tags: expect.objectContaining({
          lifecycle: 'cold_disk_cache',
          delivery_source: 'disk_cache',
          frame_boundary: 'next_frame_checkpoint',
          data_ready_at_demand: false,
        }),
      }),
    );
    expect(mockTrace).toHaveBeenCalledTimes(1);

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [
        createDelivery('positions', 'fresh_socket', 250),
        createDelivery('orders', 'fresh_socket', 260),
      ],
      contentVariant: 'positions',
      reactCommitAtMonotonicMs: 350,
      frameCheckpointAtMonotonicMs: 400,
    });

    const traceNames = mockTrace.mock.calls.map(
      (call: [{ name: string }]) => call[0].name,
    );
    expect(traceNames).toEqual(
      expect.arrayContaining([
        'Homepage Perps Time To Fresh Visible Data',
        'Homepage Perps Socket To Visible',
        'Homepage Perps Cached To Fresh Visible',
      ]),
    );
    expect(mockTrace).toHaveBeenCalledTimes(5);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Homepage Perps Cached To Fresh Visible',
        data: expect.objectContaining({ success: true }),
      }),
    );
  });

  it('records each fresh stream pipeline at most once per demand', () => {
    const demand = createDemand();
    const positions = createDelivery('positions', 'fresh_socket', 120);
    const orders = createDelivery('orders', 'disk_cache', 130);

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [positions, orders],
      contentVariant: 'positions',
      reactCommitAtMonotonicMs: 180,
      frameCheckpointAtMonotonicMs: 200,
    });
    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [createDelivery('positions', 'fresh_socket', 220), orders],
      contentVariant: 'positions',
      reactCommitAtMonotonicMs: 280,
      frameCheckpointAtMonotonicMs: 300,
    });

    const socketCalls = mockTrace.mock.calls.filter(
      (call: [{ name: string }]) =>
        call[0].name === 'Homepage Perps Socket To Visible',
    );
    expect(socketCalls).toHaveLength(1);
  });

  it('does not report offscreen-ready data as socket or cache pipeline latency', () => {
    const demand = createDemand();

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [
        createDelivery('positions', 'fresh_socket', 80),
        createDelivery('orders', 'fresh_socket', 90),
      ],
      contentVariant: 'empty',
      reactCommitAtMonotonicMs: 120,
      frameCheckpointAtMonotonicMs: 140,
    });

    const traceNames = mockTrace.mock.calls.map(
      (call: [{ name: string }]) => call[0].name,
    );
    expect(traceNames).toContain(
      'Homepage Perps Time To First Visible Content',
    );
    expect(traceNames).toContain('Homepage Perps Time To Fresh Visible Data');
    expect(traceNames).not.toContain('Homepage Perps Socket To Visible');
  });

  it('records resident fresh data as ready at demand without socket latency', () => {
    const demand = createDemand();
    const resident = (stream: 'positions' | 'orders') => ({
      ...createDelivery(stream, 'fresh_socket', 80),
      source: 'resident_state' as const,
      originSource: 'fresh_socket' as const,
    });

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [resident('positions'), resident('orders')],
      contentVariant: 'orders',
      reactCommitAtMonotonicMs: 120,
      frameCheckpointAtMonotonicMs: 140,
    });

    const freshCall = mockTrace.mock.calls.find(
      (call: [{ name: string }]) =>
        call[0].name === 'Homepage Perps Time To Fresh Visible Data',
    );
    expect(freshCall?.[0]).toEqual(
      expect.objectContaining({
        tags: expect.objectContaining({
          delivery_source: 'resident_state',
          freshness_source: 'fresh_socket',
          data_ready_at_demand: true,
        }),
      }),
    );
    expect(
      mockTrace.mock.calls.some(
        (call: [{ name: string }]) =>
          call[0].name === 'Homepage Perps Socket To Visible',
      ),
    ).toBe(false);
  });

  it('waits for post-lifecycle socket data when resident state predates recovery', () => {
    const demand = {
      ...createDemand(),
      lifecycle: 'network_recovery' as const,
      lifecycleStartedAtMonotonicMs: 90,
    };
    const staleResident = (stream: 'positions' | 'orders') => ({
      ...createDelivery(stream, 'fresh_socket', 80),
      source: 'resident_state' as const,
      originSource: 'fresh_socket' as const,
      dataAgeMs: 216_000,
    });

    expect(
      isHomepagePerpsDeliveryFreshForDemand(staleResident('orders'), demand),
    ).toBe(false);
    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [staleResident('positions'), staleResident('orders')],
      contentVariant: 'orders',
      reactCommitAtMonotonicMs: 120,
      frameCheckpointAtMonotonicMs: 140,
    });

    expect(
      mockTrace.mock.calls.some(
        (call: [{ name: string }]) =>
          call[0].name === 'Homepage Perps Time To Fresh Visible Data',
      ),
    ).toBe(false);

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [
        createDelivery('positions', 'fresh_socket', 150),
        createDelivery('orders', 'fresh_socket', 160),
      ],
      contentVariant: 'orders',
      reactCommitAtMonotonicMs: 180,
      frameCheckpointAtMonotonicMs: 200,
    });

    expect(
      mockTrace.mock.calls.some(
        (call: [{ name: string }]) =>
          call[0].name === 'Homepage Perps Time To Fresh Visible Data',
      ),
    ).toBe(true);
  });

  it('records a visible connection error as an unsuccessful first-visible outcome', () => {
    const demand = createDemand();

    recordHomepagePerpsErrorFrame({
      demand,
      frameCheckpointAtMonotonicMs: 175,
    });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Homepage Perps Time To First Visible Content',
        tags: expect.objectContaining({
          content_variant: 'error',
          delivery_source: 'none',
          success: false,
        }),
      }),
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'connection_error_visible',
        }),
      }),
    );
  });
});
