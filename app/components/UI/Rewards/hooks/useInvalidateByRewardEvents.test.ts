import { renderHook } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine/Engine';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

// Mock the Engine module
jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

describe('useInvalidateByRewardEvents', () => {
  const mockSubscribe = Engine.controllerMessenger.subscribe as jest.Mock;
  const mockUnsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;
  const mockCallback = jest.fn();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should subscribe to a single event', () => {
    const events: `RewardsController:${string}`[] = [
      'RewardsController:accountLinked',
    ];
    renderHook(() => useInvalidateByRewardEvents(events, mockCallback));

    // Verify that subscribe was called with the correct event and callback
    expect(mockSubscribe).toHaveBeenCalledWith(
      'RewardsController:accountLinked',
      mockCallback,
    );
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('should subscribe to multiple events', () => {
    const events: `RewardsController:${string}`[] = [
      'RewardsController:accountLinked',
      'RewardsController:rewardClaimed',
    ];
    renderHook(() => useInvalidateByRewardEvents(events, mockCallback));

    // Verify that subscribe was called for each event
    expect(mockSubscribe).toHaveBeenCalledWith(
      'RewardsController:accountLinked',
      mockCallback,
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'RewardsController:rewardClaimed',
      mockCallback,
    );
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe from all events on unmount', () => {
    const events: `RewardsController:${string}`[] = [
      'RewardsController:accountLinked',
      'RewardsController:rewardClaimed',
    ];
    const { unmount } = renderHook(() =>
      useInvalidateByRewardEvents(events, mockCallback),
    );

    unmount();

    // Verify that unsubscribe was called for each event
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'RewardsController:accountLinked',
      mockCallback,
    );
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'RewardsController:rewardClaimed',
      mockCallback,
    );
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it('should not subscribe if the events array is empty', () => {
    const events: `RewardsController:${string}`[] = [];
    renderHook(() => useInvalidateByRewardEvents(events, mockCallback));

    // Verify that subscribe was not called
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('should not unsubscribe if the events array is empty', () => {
    const events: `RewardsController:${string}`[] = [];
    const { unmount } = renderHook(() =>
      useInvalidateByRewardEvents(events, mockCallback),
    );

    unmount();

    // Verify that unsubscribe was not called
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });
});
