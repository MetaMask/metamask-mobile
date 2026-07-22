import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import {
  HomepageSectionPerformanceProvider,
  type HomepageSectionPerformanceSession,
  useHomepageSectionPerformanceContext,
} from './HomepageSectionPerformanceContext';

let mockIsUnlocked = true;
let mockAppStateCurrentState = 'active';
let mockAppStateListener: ((nextState: string) => void) | null = null;
let mockNow = 10;
let mockUuid = 0;

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockIsUnlocked),
}));

jest.mock('react-native-performance', () => ({
  timeOrigin: 1000,
  now: jest.fn(() => mockNow),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => `session-${++mockUuid}`),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');

  return {
    ...actual,
    AppState: {
      get currentState() {
        return mockAppStateCurrentState;
      },
      addEventListener: jest.fn((_eventName, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      }),
    },
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const ConsumerProbe = ({
  onContext,
}: {
  onContext: (
    context: ReturnType<typeof useHomepageSectionPerformanceContext>,
  ) => void;
}) => {
  const context = useHomepageSectionPerformanceContext();

  useEffect(() => {
    onContext(context);
  }, [context, onContext]);

  return null;
};

const renderProvider = (
  onContext: (
    context: ReturnType<typeof useHomepageSectionPerformanceContext>,
  ) => void,
) =>
  render(
    <HomepageSectionPerformanceProvider>
      <ConsumerProbe onContext={onContext} />
    </HomepageSectionPerformanceProvider>,
  );

describe('HomepageSectionPerformanceProvider', () => {
  beforeEach(() => {
    mockIsUnlocked = true;
    mockAppStateCurrentState = 'active';
    mockAppStateListener = null;
    mockNow = 10;
    mockUuid = 0;
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(() => mockIsUnlocked);
  });

  it('arms an initial app-open session when mounted active and unlocked', () => {
    let context: ReturnType<
      typeof useHomepageSectionPerformanceContext
    > | null = null;

    renderProvider((nextContext) => {
      context = nextContext;
    });

    let claimedSession: HomepageSectionPerformanceSession | null = null;
    act(() => {
      claimedSession = context?.claimPendingSession() ?? null;
    });

    expect(claimedSession).toEqual({
      id: 'session-1',
      startTime: 1010,
      trigger: 'app_open',
    });
  });

  it('consumes the pending session only once', () => {
    let context: ReturnType<
      typeof useHomepageSectionPerformanceContext
    > | null = null;

    renderProvider((nextContext) => {
      context = nextContext;
    });

    let firstClaim: HomepageSectionPerformanceSession | null = null;
    let secondClaim: HomepageSectionPerformanceSession | null = null;

    act(() => {
      firstClaim = context?.claimPendingSession() ?? null;
    });
    act(() => {
      secondClaim = context?.claimPendingSession() ?? null;
    });

    expect(firstClaim?.trigger).toBe('app_open');
    expect(secondClaim).toBeNull();
  });

  it('arms unlock when lock state transitions from locked to unlocked', () => {
    mockIsUnlocked = false;
    let context: ReturnType<
      typeof useHomepageSectionPerformanceContext
    > | null = null;

    const { rerender } = render(
      <HomepageSectionPerformanceProvider>
        <ConsumerProbe
          onContext={(nextContext) => {
            context = nextContext;
          }}
        />
      </HomepageSectionPerformanceProvider>,
    );

    mockIsUnlocked = true;
    mockUseSelector.mockImplementation(() => true);
    mockNow = 20;

    rerender(
      <HomepageSectionPerformanceProvider>
        <ConsumerProbe
          onContext={(nextContext) => {
            context = nextContext;
          }}
        />
      </HomepageSectionPerformanceProvider>,
    );

    let claimedSession: HomepageSectionPerformanceSession | null = null;
    act(() => {
      claimedSession = context?.claimPendingSession() ?? null;
    });

    expect(claimedSession).toEqual({
      id: 'session-1',
      startTime: 1020,
      trigger: 'unlock',
    });
  });

  it('arms app-open on background to active while unlocked', () => {
    let context: ReturnType<
      typeof useHomepageSectionPerformanceContext
    > | null = null;

    renderProvider((nextContext) => {
      context = nextContext;
    });
    act(() => {
      context?.claimPendingSession();
    });

    mockNow = 30;
    act(() => {
      const appStateListener = (AppState.addEventListener as jest.Mock).mock
        .calls[0][1];
      appStateListener('background');
      appStateListener('active');
    });

    let claimedSession: HomepageSectionPerformanceSession | null = null;
    act(() => {
      claimedSession = context?.claimPendingSession() ?? null;
    });

    expect(AppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(claimedSession).toEqual({
      id: 'session-2',
      startTime: 1030,
      trigger: 'app_open',
    });
  });
});
