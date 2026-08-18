import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import performance from 'react-native-performance';
import {
  activateHomepagePerformanceProbe,
  createHomepagePerformanceDemand,
  createHomepagePerpsDelivery,
  createHomepagePerpsResidentDelivery,
  isHomepagePerpsDeliveryFreshForDemand,
  handleHomepagePerformanceAppStateChange,
  logHomepagePerformanceStage,
  markHomepagePerpsAccountSwitch,
  markHomepagePerformanceDemandComplete,
  recordHomepagePerpsVisibleFrame,
  resetHomepagePerformanceProbeForTests,
} from './homepagePerformanceProbe';

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'demand-1'),
}));

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: {
    now: jest.fn(() => 1000),
  },
}));

const stages = () =>
  jest
    .mocked(DevLogger.log)
    .mock.calls.map(([message]) => String(message))
    .filter((message) => message.includes('[PerpsPerf]'))
    .map(
      (message) =>
        JSON.parse(message.replace('[PerpsPerf] ', '')) as {
          stage: string;
        },
    );

describe('homepagePerformanceProbe', () => {
  const devGlobal = global as typeof global & { __DEV__: boolean };
  const previousDev = devGlobal.__DEV__;

  beforeAll(() => {
    devGlobal.__DEV__ = true;
  });

  afterAll(() => {
    devGlobal.__DEV__ = previousDev;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(performance.now).mockReturnValue(1000);
    resetHomepagePerformanceProbeForTests();
    activateHomepagePerformanceProbe();
  });

  it('emits the canonical surface_demand stage', () => {
    createHomepagePerformanceDemand();

    expect(stages()).toEqual([
      expect.objectContaining({ stage: 'surface_demand' }),
    ]);
  });

  it('records resolved and live surface stages from a fresh demand', () => {
    const demand = createHomepagePerformanceDemand();
    const positions = createHomepagePerpsDelivery({
      stream: 'positions',
      source: 'fresh_socket',
      itemCount: 1,
    });
    const orders = createHomepagePerpsDelivery({
      stream: 'orders',
      source: 'fresh_socket',
      itemCount: 0,
    });
    const account = createHomepagePerpsDelivery({
      stream: 'account',
      source: 'fresh_socket',
      itemCount: 1,
    });

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [positions, orders, account],
      contentVariant: 'positions',
      reactCommitAtMonotonicMs: 1100,
      frameCheckpointAtMonotonicMs: 1200,
    });

    expect(stages().map(({ stage }) => stage)).toEqual([
      'surface_demand',
      'surface_resolved_recorded',
      'surface_live_recorded',
    ]);
  });

  it('does not satisfy a demand with a prior-account delivery', () => {
    const stale = createHomepagePerpsDelivery({
      stream: 'positions',
      source: 'fresh_socket',
      itemCount: 1,
    });
    markHomepagePerpsAccountSwitch();
    const demand = createHomepagePerformanceDemand();

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [stale],
      contentVariant: 'positions',
      reactCommitAtMonotonicMs: 1100,
      frameCheckpointAtMonotonicMs: 1200,
    });

    expect(stages().map(({ stage }) => stage)).toEqual(['surface_demand']);
  });

  it('treats resident Terminal-origin markets as fresh in the current lifecycle', () => {
    const cached = createHomepagePerpsDelivery({
      stream: 'markets',
      source: 'memory_cache',
      originSource: 'terminal_global_snapshot_v2',
      itemCount: 2,
    });
    const resident = createHomepagePerpsResidentDelivery({
      stream: 'markets',
      itemCount: 2,
      previousDelivery: cached,
    });
    const demand = createHomepagePerformanceDemand();

    expect(resident.originSource).toBe('terminal_global_snapshot_v2');
    expect(isHomepagePerpsDeliveryFreshForDemand(resident, demand)).toBe(true);
  });

  it('does not treat resident markets without a fresh origin as fresh', () => {
    const cached = createHomepagePerpsDelivery({
      stream: 'markets',
      source: 'memory_cache',
      itemCount: 2,
    });
    const resident = createHomepagePerpsResidentDelivery({
      stream: 'markets',
      itemCount: 2,
      previousDelivery: cached,
    });
    const demand = createHomepagePerformanceDemand();

    expect(resident.originSource).toBe('memory_cache');
    expect(isHomepagePerpsDeliveryFreshForDemand(resident, demand)).toBe(false);
  });

  it('does not require an unrelated price delivery for trending', () => {
    const stalePrice = createHomepagePerpsDelivery({
      stream: 'prices',
      source: 'fresh_socket',
      itemCount: 1,
    });
    markHomepagePerpsAccountSwitch();
    const demand = createHomepagePerformanceDemand();
    const deliveries = [
      createHomepagePerpsDelivery({
        stream: 'positions',
        source: 'fresh_socket',
        itemCount: 0,
      }),
      createHomepagePerpsDelivery({
        stream: 'orders',
        source: 'fresh_socket',
        itemCount: 0,
      }),
      createHomepagePerpsDelivery({
        stream: 'account',
        source: 'fresh_socket',
        itemCount: 1,
      }),
      createHomepagePerpsDelivery({
        stream: 'markets',
        source: 'provider',
        itemCount: 2,
      }),
      stalePrice,
    ];

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries,
      contentVariant: 'trending',
      reactCommitAtMonotonicMs: 1100,
      frameCheckpointAtMonotonicMs: 1200,
    });

    expect(stages().map(({ stage }) => stage)).toEqual([
      'surface_demand',
      'surface_resolved_recorded',
      'surface_live_recorded',
    ]);
  });

  it('does not let an old demand complete a new account generation', () => {
    const demand = createHomepagePerformanceDemand();
    markHomepagePerpsAccountSwitch();
    const deliveries = ['positions', 'orders', 'account'].map((stream) =>
      createHomepagePerpsDelivery({
        stream: stream as 'positions' | 'orders' | 'account',
        source: 'fresh_socket',
        itemCount: 1,
      }),
    );

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries,
      contentVariant: 'positions',
      reactCommitAtMonotonicMs: 1100,
      frameCheckpointAtMonotonicMs: 1200,
    });
    markHomepagePerformanceDemandComplete(demand);

    expect(stages().map(({ stage }) => stage)).toEqual(['surface_demand']);
    expect(createHomepagePerformanceDemand().lifecycle).toBe('account_switch');
  });

  it('ages chained resident deliveries without double counting', () => {
    const origin = createHomepagePerpsDelivery({
      stream: 'markets',
      source: 'memory_cache',
      itemCount: 2,
      dataAgeMs: 50,
    });
    jest.mocked(performance.now).mockReturnValue(1010);
    const first = createHomepagePerpsResidentDelivery({
      stream: 'markets',
      itemCount: 2,
      previousDelivery: origin,
    });
    jest.mocked(performance.now).mockReturnValue(1020);
    const second = createHomepagePerpsResidentDelivery({
      stream: 'markets',
      itemCount: 2,
      previousDelivery: first,
    });

    expect(first.dataAgeMs).toBe(60);
    expect(second.dataAgeMs).toBe(70);
  });

  it('ignores iOS inactive when classifying a background lifecycle', () => {
    handleHomepagePerformanceAppStateChange('inactive');
    jest.mocked(performance.now).mockReturnValue(30_000);
    handleHomepagePerformanceAppStateChange('active');

    expect(createHomepagePerformanceDemand().lifecycle).toBe('cold_no_cache');
  });

  it('allowlists detail fields and preserves the canonical stage', () => {
    logHomepagePerformanceStage('react_commit', undefined, {
      stage: 'overridden',
      wallet_address: '0xprivate',
      duration_ms: 12,
    });

    const record = stages()[0] as Record<string, unknown>;
    expect(record).toMatchObject({ stage: 'react_commit', duration_ms: 12 });
    expect(record).not.toHaveProperty('wallet_address');
  });
});
