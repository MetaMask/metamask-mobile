import { act, renderHook } from '@testing-library/react-native';
import { DevLogger } from '../../../../../../core/SDKConnect/utils/DevLogger';
import type { PerpsLoadingSessionUpdate } from '../../../../../UI/Perps/utils/perpsLoadingSession';
import { useHomepagePerpsSurfaceMetrics } from './useHomepagePerpsSurfaceMetrics';

let mockLoadingSessionListener:
  | ((update: PerpsLoadingSessionUpdate) => void)
  | undefined;
let mockNow = 100;
let mockUuidIndex = 0;

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: { now: jest.fn(() => (mockNow += 10)) },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => `demand-${++mockUuidIndex}`),
}));

jest.mock('../../../../../UI/Perps/utils/perpsLoadingSession', () => ({
  getPerpsLoadingSessionContext: jest.fn((sessionId: string) => ({
    id: sessionId,
    marketSource: 'unknown',
    accountSource: 'unknown',
    lifecycle: 'cold_no_cache',
    accountGeneration: 2,
    contextGeneration: 4,
  })),
  subscribeToPerpsLoadingSession: jest.fn(
    (listener: typeof mockLoadingSessionListener) => {
      mockLoadingSessionListener = listener;
      return jest.fn();
    },
  ),
}));

jest.mock('../../../../../../core/SDKConnect/utils/DevLogger');

const parseStages = () =>
  (DevLogger.log as jest.Mock).mock.calls.map(([message]) =>
    JSON.parse(String(message).replace('[PerpsPerf] ', '')),
  );

type SurfaceMetricsProps = Parameters<typeof useHomepagePerpsSurfaceMetrics>[0];

const defaultProps: SurfaceMetricsProps = {
  isVisible: true,
  isRendered: true,
  isFocused: true,
  sessionId: 'session-1',
  lifecycle: 'cold_no_cache' as const,
  contentVariant: 'trending' as const,
  contentReady: false,
  hasError: false,
  marketSource: 'terminal_v2' as const,
  resolvedSource: 'terminal_v2',
};

describe('useHomepagePerpsSurfaceMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadingSessionListener = undefined;
    mockNow = 100;
    mockUuidIndex = 0;
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    global.cancelAnimationFrame = jest.fn();
  });

  it('records demand, committed UI, resolved content, and live content once', () => {
    const { rerender } = renderHook(
      (props: SurfaceMetricsProps) => useHomepagePerpsSurfaceMetrics(props),
      { initialProps: defaultProps },
    );

    expect(parseStages().map(({ stage }) => stage)).toEqual([
      'surface_demand',
      'surface_initial_ui_recorded',
    ]);

    rerender({ ...defaultProps, contentReady: true });
    act(() => {
      mockLoadingSessionListener?.({
        type: 'finished',
        context: {
          id: 'session-1',
          marketSource: 'terminal_v2',
          accountSource: 'fresh_socket',
          lifecycle: 'cold_no_cache',
          accountGeneration: 2,
          contextGeneration: 4,
        },
      });
    });

    const records = parseStages();
    expect(records.map(({ stage }) => stage)).toEqual([
      'surface_demand',
      'surface_initial_ui_recorded',
      'surface_resolved_recorded',
      'surface_live_recorded',
    ]);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'surface_live_recorded',
          demand_id: 'demand-1',
          perps_session_id: 'session-1',
          content_variant: 'trending',
          source: 'terminal_v2',
          market_source: 'terminal_v2',
          fresh_for_lifecycle: true,
          account_generation: 2,
          context_generation: 4,
        }),
      ]),
    );
  });

  it('starts a new demand when the session lifecycle upgrades', () => {
    renderHook(
      (props: SurfaceMetricsProps) => useHomepagePerpsSurfaceMetrics(props),
      { initialProps: defaultProps },
    );

    act(() => {
      mockLoadingSessionListener?.({
        type: 'lifecycle',
        context: {
          id: 'session-1',
          marketSource: 'unknown',
          accountSource: 'unknown',
          lifecycle: 'background_reconnect',
          accountGeneration: 2,
          contextGeneration: 4,
        },
      });
    });

    expect(parseStages().slice(-2)).toEqual([
      expect.objectContaining({
        stage: 'surface_demand',
        demand_id: 'demand-2',
        lifecycle: 'background_reconnect',
      }),
      expect.objectContaining({
        stage: 'surface_initial_ui_recorded',
        demand_id: 'demand-2',
        lifecycle: 'background_reconnect',
      }),
    ]);
  });

  it('records the connection generation for fresh account content', () => {
    const props: SurfaceMetricsProps = {
      ...defaultProps,
      contentVariant: 'positions' as const,
      contentReady: true,
      resolvedSource: 'memory_cache',
    };
    renderHook(() => useHomepagePerpsSurfaceMetrics(props));

    act(() => {
      mockLoadingSessionListener?.({
        type: 'finished',
        context: {
          id: 'session-1',
          marketSource: 'memory_cache',
          accountSource: 'fresh_socket',
          lifecycle: 'cold_no_cache',
          accountGeneration: 2,
          contextGeneration: 4,
          connectionGeneration: 3,
        },
      });
    });

    expect(parseStages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'surface_live_recorded',
          source: 'fresh_socket',
          account_generation: 2,
          context_generation: 4,
          connection_generation: 3,
        }),
      ]),
    );
  });

  it('records nothing while the section is outside the viewport', () => {
    renderHook(() =>
      useHomepagePerpsSurfaceMetrics({
        ...defaultProps,
        isVisible: false,
      }),
    );

    expect(DevLogger.log).not.toHaveBeenCalled();
  });

  it('records nothing while another screen covers the homepage', () => {
    renderHook(() =>
      useHomepagePerpsSurfaceMetrics({
        ...defaultProps,
        isFocused: false,
      }),
    );

    expect(DevLogger.log).not.toHaveBeenCalled();
  });

  it('records nothing after the section stops rendering', () => {
    const { rerender } = renderHook(
      (props: SurfaceMetricsProps) => useHomepagePerpsSurfaceMetrics(props),
      { initialProps: defaultProps },
    );
    jest.mocked(DevLogger.log).mockClear();

    rerender({ ...defaultProps, isRendered: false, contentReady: true });
    act(() => {
      mockLoadingSessionListener?.({
        type: 'finished',
        context: {
          id: 'session-1',
          marketSource: 'unknown',
          accountSource: 'unknown',
          lifecycle: 'cold_no_cache',
          accountGeneration: 2,
          contextGeneration: 4,
        },
      });
    });

    expect(DevLogger.log).not.toHaveBeenCalled();
  });

  it('does not label unknown-source content as lifecycle-fresh', () => {
    const props: SurfaceMetricsProps = {
      ...defaultProps,
      resolvedSource: 'unknown',
    };
    const { rerender } = renderHook(
      (currentProps: typeof props) =>
        useHomepagePerpsSurfaceMetrics(currentProps),
      { initialProps: props },
    );

    rerender({ ...props, contentReady: true });
    act(() => {
      mockLoadingSessionListener?.({
        type: 'finished',
        context: {
          id: 'session-1',
          marketSource: 'unknown',
          accountSource: 'unknown',
          lifecycle: 'network_switch',
          accountGeneration: 2,
          contextGeneration: 4,
        },
      });
    });

    expect(parseStages().map(({ stage }) => stage)).toEqual([
      'surface_demand',
      'surface_initial_ui_recorded',
      'surface_resolved_recorded',
    ]);
  });

  it('does not label cached Terminal content as lifecycle-fresh', () => {
    const props: SurfaceMetricsProps = {
      ...defaultProps,
      resolvedSource: 'memory_cache',
    };
    const { rerender } = renderHook(
      (currentProps: typeof props) =>
        useHomepagePerpsSurfaceMetrics(currentProps),
      { initialProps: props },
    );

    rerender({ ...props, contentReady: true });
    act(() => {
      mockLoadingSessionListener?.({
        type: 'finished',
        context: {
          id: 'session-1',
          marketSource: 'memory_cache',
          accountSource: 'unknown',
          lifecycle: 'navigate_return',
          accountGeneration: 2,
          contextGeneration: 4,
        },
      });
    });

    expect(parseStages().map(({ stage }) => stage)).toEqual([
      'surface_demand',
      'surface_initial_ui_recorded',
      'surface_resolved_recorded',
    ]);
  });

  it('accepts retained market content for an account-only switch', () => {
    const props: SurfaceMetricsProps = {
      ...defaultProps,
      lifecycle: 'account_switch' as const,
      contentReady: true,
      marketSource: 'memory_cache' as const,
      resolvedSource: 'unknown',
    };
    renderHook(() => useHomepagePerpsSurfaceMetrics(props));

    act(() => {
      mockLoadingSessionListener?.({
        type: 'finished',
        context: {
          id: 'session-1',
          marketSource: 'unknown',
          accountSource: 'fresh_socket',
          lifecycle: 'account_switch',
          accountGeneration: 3,
          contextGeneration: 4,
          connectionGeneration: 5,
        },
      });
    });

    expect(parseStages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'surface_live_recorded',
          lifecycle: 'account_switch',
          content_variant: 'trending',
          source: 'retained_market_context',
          market_source: 'memory_cache',
          fresh_for_lifecycle: true,
        }),
      ]),
    );
  });

  it('starts a new demand when the loading generation changes', () => {
    const { rerender } = renderHook(
      (props: SurfaceMetricsProps) => useHomepagePerpsSurfaceMetrics(props),
      { initialProps: defaultProps },
    );

    rerender({ ...defaultProps, sessionId: 'session-2' });

    expect(
      parseStages()
        .filter(({ stage }) => stage === 'surface_demand')
        .map(({ demand_id, perps_session_id }) => ({
          demand_id,
          perps_session_id,
        })),
    ).toEqual([
      { demand_id: 'demand-1', perps_session_id: 'session-1' },
      { demand_id: 'demand-2', perps_session_id: 'session-2' },
    ]);
  });

  it('retains a known market source for a warm generation without a new market milestone', () => {
    const { rerender } = renderHook(
      (props: SurfaceMetricsProps) => useHomepagePerpsSurfaceMetrics(props),
      { initialProps: defaultProps },
    );

    act(() => {
      mockLoadingSessionListener?.({
        type: 'finished',
        context: {
          id: 'session-1',
          marketSource: 'provider',
          accountSource: 'fresh_socket',
          lifecycle: 'cold_no_cache',
          accountGeneration: 2,
          contextGeneration: 4,
        },
      });
    });

    rerender({
      ...defaultProps,
      sessionId: 'session-2',
      lifecycle: 'navigate_return',
      contentReady: true,
      marketSource: 'unknown',
      resolvedSource: 'unknown',
    });

    expect(parseStages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'surface_resolved_recorded',
          perps_session_id: 'session-2',
          source: 'provider',
        }),
      ]),
    );
  });
});
