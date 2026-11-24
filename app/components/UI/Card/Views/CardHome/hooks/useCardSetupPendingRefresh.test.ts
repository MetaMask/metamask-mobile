import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import useUserRegistrationStatus from '../../../hooks/useUserRegistrationStatus';
import {
  CARD_SETUP_CREATING_POLL_MS,
  CARD_SETUP_PENDING_POLL_MS,
  deriveCardHomeSetupPollIntervalMs,
  useCardSetupPendingRefresh,
} from './useCardSetupPendingRefresh';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

const mockStartPolling = jest.fn();
const mockStopPolling = jest.fn();
jest.mock('../../../hooks/useUserRegistrationStatus', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    startPolling: mockStartPolling,
    stopPolling: mockStopPolling,
  })),
}));

const mockFetch = jest.mocked(
  Engine.context.CardController.fetchCardHomeData,
) as jest.Mock;
const mockUseSelector = jest.mocked(useSelector);

let appStateHandler: ((state: string) => void) | undefined;
const mockRemove = jest.fn();

describe('useCardSetupPendingRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSelector.mockReturnValue('onboarding-1');
    jest.mocked(useUserRegistrationStatus).mockReturnValue({
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    } as unknown as ReturnType<typeof useUserRegistrationStatus>);
    appStateHandler = undefined;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: mockRemove };
      });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('force-refetches Card home data every 15s while signed in and pending', () => {
    renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: true,
        isFocused: true,
      }),
    );

    expect(mockFetch).not.toHaveBeenCalled();
    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith({ force: true });
    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockStartPolling).not.toHaveBeenCalled();
  });

  it('does not fire just before the default 15s cadence elapses', () => {
    renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: true,
        isFocused: true,
      }),
    );

    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS - 1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('polls faster while the card is being created (A08)', () => {
    renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: true,
        isFocused: true,
        pollIntervalMs: CARD_SETUP_CREATING_POLL_MS,
      }),
    );

    jest.advanceTimersByTime(CARD_SETUP_CREATING_POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(CARD_SETUP_CREATING_POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('re-arms the interval when the cadence changes without double-firing', () => {
    const { rerender } = renderHook(
      ({ pollIntervalMs }) =>
        useCardSetupPendingRefresh({
          isPending: true,
          isAuthenticated: true,
          isFocused: true,
          pollIntervalMs,
        }),
      { initialProps: { pollIntervalMs: CARD_SETUP_CREATING_POLL_MS } },
    );

    jest.advanceTimersByTime(CARD_SETUP_CREATING_POLL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // The creating card moved on to a review: the slower cadence replaces
    // the fast one and the old interval does not keep firing.
    rerender({ pollIntervalMs: CARD_SETUP_PENDING_POLL_MS });
    jest.advanceTimersByTime(CARD_SETUP_CREATING_POLL_MS * 2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(
      CARD_SETUP_PENDING_POLL_MS - CARD_SETUP_CREATING_POLL_MS * 2,
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('force-refetches when the app returns to the foreground', () => {
    renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: true,
        isFocused: true,
      }),
    );

    appStateHandler?.('background');
    expect(mockFetch).not.toHaveBeenCalled();
    appStateHandler?.('active');
    expect(mockFetch).toHaveBeenCalledWith({ force: true });
  });

  it('stops once the pending state clears', () => {
    const { rerender } = renderHook(
      ({ isPending }) =>
        useCardSetupPendingRefresh({
          isPending,
          isAuthenticated: true,
          isFocused: true,
        }),
      { initialProps: { isPending: true } },
    );

    rerender({ isPending: false });
    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('stops when the screen loses focus', () => {
    const { rerender } = renderHook(
      ({ isFocused }) =>
        useCardSetupPendingRefresh({
          isPending: true,
          isAuthenticated: true,
          isFocused,
        }),
      { initialProps: { isFocused: true } },
    );

    rerender({ isFocused: false });
    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stops on unmount', () => {
    const { unmount } = renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: true,
        isFocused: true,
      }),
    );

    unmount();
    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('does nothing when not pending', () => {
    renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: false,
        isAuthenticated: true,
        isFocused: true,
      }),
    );

    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
    expect(mockStartPolling).not.toHaveBeenCalled();
  });

  it('polls registration status instead when signed out, and stops on blur', () => {
    const { rerender } = renderHook(
      ({ isFocused }) =>
        useCardSetupPendingRefresh({
          isPending: true,
          isAuthenticated: false,
          isFocused,
        }),
      { initialProps: { isFocused: true } },
    );

    expect(mockStartPolling).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
    expect(mockFetch).not.toHaveBeenCalled();

    rerender({ isFocused: false });

    expect(mockStopPolling).toHaveBeenCalledTimes(1);
  });

  it('invalidates the registration status query on refresh', async () => {
    const { result } = renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: false,
        isFocused: true,
      }),
    );

    await result.current.refreshRegistrationStatus();

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: expect.arrayContaining(['registrationStatus', 'onboarding-1']),
    });
  });

  it('skips the registration refresh without an onboarding session', async () => {
    mockUseSelector.mockReturnValue(null);
    const { result } = renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: false,
        isFocused: true,
      }),
    );

    await result.current.refreshRegistrationStatus();

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('does not fetch while offline', () => {
    renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: true,
        isFocused: true,
        pollIntervalMs: null,
      }),
    );

    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);
    appStateHandler?.('active');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockStartPolling).not.toHaveBeenCalled();
  });

  it('does not interval-fetch while Immersve is already polling', () => {
    renderHook(() =>
      useCardSetupPendingRefresh({
        isPending: true,
        isAuthenticated: true,
        isFocused: true,
        suspendSignedInPoll: true,
      }),
    );

    jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);
    expect(mockFetch).not.toHaveBeenCalled();

    appStateHandler?.('active');
    expect(mockFetch).toHaveBeenCalledWith({ force: true });
  });
});

describe('deriveCardHomeSetupPollIntervalMs', () => {
  it('does not poll when there is no network, on every hardware tier', () => {
    expect(deriveCardHomeSetupPollIntervalMs('LOW', 'NONE', true)).toBeNull();
    expect(deriveCardHomeSetupPollIntervalMs(null, 'NONE', false)).toBeNull();
    expect(deriveCardHomeSetupPollIntervalMs('HIGH', 'NONE', true)).toBeNull();
  });

  it('uses the rare cadence on a slow cellular link, including while creating', () => {
    expect(
      deriveCardHomeSetupPollIntervalMs('LOW', 'SLOW_CELLULAR', true),
    ).toBe(CARD_SETUP_PENDING_POLL_MS);
    expect(
      deriveCardHomeSetupPollIntervalMs('HIGH', 'SLOW_CELLULAR', false),
    ).toBe(CARD_SETUP_PENDING_POLL_MS);
  });

  it('keeps the product cadence on a fast or unknown network', () => {
    expect(deriveCardHomeSetupPollIntervalMs('MID', 'WIFI', true)).toBe(
      CARD_SETUP_CREATING_POLL_MS,
    );
    expect(deriveCardHomeSetupPollIntervalMs('MID', null, false)).toBe(
      CARD_SETUP_PENDING_POLL_MS,
    );
    expect(deriveCardHomeSetupPollIntervalMs(null, 'FAST_CELLULAR', true)).toBe(
      CARD_SETUP_CREATING_POLL_MS,
    );
  });
});
