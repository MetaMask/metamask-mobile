import { renderHook } from '@testing-library/react-native';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import type {
  SocialContentState,
  SocialPerformanceContext,
  SocialTraceTab,
} from '../../../../../util/social/socialPerformance';
import { useSocialTabFirstContentTrace } from './useSocialTabFirstContentTrace';

jest.mock('../../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    SocialTabTimeToContent: 'Social Tab Time To Content',
  },
  TraceOperation: {
    SocialPerformance: 'social.performance',
  },
}));

jest.mock('uuid', () => ({
  v4: () => 'social-content-trace-id',
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

const createPerformance = (
  overrides: Partial<SocialPerformanceContext> = {},
): SocialPerformanceContext => ({
  enabled: true,
  hardwareTier: 'HIGH',
  isActive: true,
  isFocused: true,
  networkTier: 'WIFI',
  ...overrides,
});

const renderMeasurement = ({
  contentState = null,
  hasUsableData = false,
  performance = createPerformance(),
  tab = 'trending',
}: {
  contentState?: SocialContentState | null;
  hasUsableData?: boolean;
  performance?: SocialPerformanceContext;
  tab?: SocialTraceTab;
} = {}) =>
  renderHook((props) => useSocialTabFirstContentTrace(props), {
    initialProps: {
      contentState,
      hasUsableData,
      performance,
      tab,
    },
  });

describe('useSocialTabFirstContentTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits no trace outside the active treatment', () => {
    renderMeasurement({
      contentState: 'content',
      performance: createPerformance({ enabled: false }),
    });

    expect(mockTrace).not.toHaveBeenCalled();
    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it.each(['trending', 'following', 'leaderboard', 'live_trades'] as const)(
    'ends first content for the %s tab',
    (tab) => {
      renderMeasurement({ tab, contentState: 'content' });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.SocialTabTimeToContent,
          op: TraceOperation.SocialPerformance,
          tags: expect.objectContaining({ feature: 'social_v1', tab }),
        }),
      );
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { success: true, content_state: 'content' },
        }),
      );
    },
  );

  it.each(['empty', 'error'] as const)(
    'records the %s terminal UI outcome',
    (contentState) => {
      renderMeasurement({ contentState });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          status: contentState === 'error' ? 'error' : 'ok',
          data: {
            success: contentState !== 'error',
            content_state: contentState,
          },
        }),
      );
    },
  );

  it.each([
    [false, 'cold'],
    [true, 'warm'],
  ] as const)('tags cache readiness %s as %s', (hasUsableData, cacheState) => {
    renderMeasurement({ hasUsableData, contentState: 'content' });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({ cache_state: cacheState }),
      }),
    );
  });

  it('keeps hardware and network cohorts separate', () => {
    renderMeasurement({
      contentState: 'content',
      performance: createPerformance({
        hardwareTier: 'LOW',
        networkTier: 'SLOW_CELLULAR',
      }),
    });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({
          hardware_tier: 'low',
          network_tier: 'slow_cellular',
        }),
      }),
    );
  });

  it('ends an unfinished trace on unmount', () => {
    const { unmount } = renderMeasurement();

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        data: { success: false, reason: 'unmounted' },
      }),
    );
  });

  it('ends an unfinished trace when treatment becomes disabled', () => {
    const { rerender } = renderMeasurement();

    rerender({
      contentState: null,
      hasUsableData: false,
      performance: createPerformance({ enabled: false }),
      tab: 'trending',
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { success: false, reason: 'treatment_disabled' },
      }),
    );
  });

  it('ends an abandoned tab activation as unfocused', () => {
    const { rerender } = renderMeasurement();

    rerender({
      contentState: null,
      hasUsableData: false,
      performance: createPerformance({ isActive: false }),
      tab: 'trending',
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { success: false, reason: 'unfocused' },
      }),
    );
  });

  it('does not restart after a completed tab revisit', () => {
    const { rerender } = renderMeasurement({ contentState: 'content' });

    rerender({
      contentState: 'content',
      hasUsableData: true,
      performance: createPerformance({ isActive: false }),
      tab: 'trending',
    });
    rerender({
      contentState: 'content',
      hasUsableData: true,
      performance: createPerformance(),
      tab: 'trending',
    });

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });
});
