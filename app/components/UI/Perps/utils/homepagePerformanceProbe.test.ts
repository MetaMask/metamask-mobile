import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  activateHomepagePerformanceProbe,
  createHomepagePerformanceDemand,
  createHomepagePerpsDelivery,
  createHomepagePerpsResidentDelivery,
  isHomepagePerpsDeliveryFreshForDemand,
  markHomepagePerpsAccountSwitch,
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

    recordHomepagePerpsVisibleFrame({
      demand,
      deliveries: [positions, orders],
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
});
