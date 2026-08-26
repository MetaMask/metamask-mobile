import { renderHook } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { TraceName, TraceOperation } from '../../../../util/trace';
import { useRewardsTabPerformance } from './useRewardsTabPerformance';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    RewardsTabTimeToContent: 'Rewards Tab Time To Content',
  },
  TraceOperation: {
    RewardsPerformance: 'rewards.performance',
  },
}));

const { trace: mockTrace, endTrace: mockEndTrace } = jest.requireMock(
  '../../../../util/trace',
);

const mockStore = configureMockStore();

function createWrapper(store: ReturnType<typeof mockStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

const buildState = ({
  subscriptionId = null as string | null,
  candidateSubscriptionId = 'pending' as
    | string
    | 'pending'
    | 'error'
    | 'retry'
    | null,
} = {}) => ({
  engine: {
    backgroundState: {
      RewardsController: {
        activeAccount: subscriptionId
          ? { subscriptionId, account: '0x1', hasOptedIn: true }
          : null,
      },
    },
  },
  rewards: {
    candidateSubscriptionId,
  },
});

describe('useRewardsTabPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the Rewards tab TTC span on mount without ending while pending', () => {
    const store = mockStore(buildState());

    renderHook(() => useRewardsTabPerformance({ isVersionBlocked: false }), {
      wrapper: createWrapper(store),
    });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RewardsTabTimeToContent,
        op: TraceOperation.RewardsPerformance,
        tags: { feature: 'rewards' },
      }),
    );
    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('ends with onboarding when candidate is already resolved', () => {
    const store = mockStore(buildState({ candidateSubscriptionId: 'error' }));

    renderHook(() => useRewardsTabPerformance({ isVersionBlocked: false }), {
      wrapper: createWrapper(store),
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RewardsTabTimeToContent,
        data: { success: true, content_state: 'onboarding' },
      }),
    );
  });

  it('ends with dashboard when subscription is present', () => {
    const store = mockStore(buildState({ subscriptionId: 'sub-1' }));

    renderHook(() => useRewardsTabPerformance({ isVersionBlocked: false }), {
      wrapper: createWrapper(store),
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RewardsTabTimeToContent,
        data: { success: true, content_state: 'dashboard' },
      }),
    );
  });

  it('ends with update_required when version-blocked', () => {
    const store = mockStore(buildState());

    renderHook(() => useRewardsTabPerformance({ isVersionBlocked: true }), {
      wrapper: createWrapper(store),
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RewardsTabTimeToContent,
        data: { success: true, content_state: 'update_required' },
      }),
    );
  });

  it('ends as failure when unmounted before content is ready', () => {
    const store = mockStore(buildState({ candidateSubscriptionId: 'pending' }));

    const { unmount } = renderHook(
      () => useRewardsTabPerformance({ isVersionBlocked: false }),
      { wrapper: createWrapper(store) },
    );

    unmount();

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RewardsTabTimeToContent,
        data: { success: false, reason: 'unmounted' },
      }),
    );
  });
});
