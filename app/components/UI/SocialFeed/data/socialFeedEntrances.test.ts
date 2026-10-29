import { act, renderHook } from '@testing-library/react-native';
import {
  createSocialFeedEntrances,
  useSocialFeedEntranceEventId,
} from './socialFeedEntrances';

describe('createSocialFeedEntrances', () => {
  it('reports an entrance as played once marked', () => {
    const entrances = createSocialFeedEntrances();

    entrances.markPlayed('event-1');

    expect(entrances.hasPlayed('event-1')).toBe(true);
    expect(entrances.hasPlayed('event-2')).toBe(false);
  });

  it('notifies only the listeners of the entrance that played', () => {
    const entrances = createSocialFeedEntrances();
    const playedListener = jest.fn();
    const otherListener = jest.fn();
    entrances.subscribe('event-1', playedListener);
    entrances.subscribe('event-2', otherListener);

    entrances.markPlayed('event-1');
    entrances.markPlayed('event-1');

    expect(playedListener).toHaveBeenCalledTimes(1);
    expect(otherListener).not.toHaveBeenCalled();
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const entrances = createSocialFeedEntrances();
    const listener = jest.fn();
    const unsubscribe = entrances.subscribe('event-1', listener);

    unsubscribe();
    entrances.markPlayed('event-1');

    expect(listener).not.toHaveBeenCalled();
  });

  it('forgets played entrances outside the retained event IDs', () => {
    const entrances = createSocialFeedEntrances();
    entrances.markPlayed('event-1');
    entrances.markPlayed('event-2');

    entrances.retain(new Set(['event-2']));

    expect(entrances.hasPlayed('event-1')).toBe(false);
    expect(entrances.hasPlayed('event-2')).toBe(true);
  });
});

describe('useSocialFeedEntranceEventId', () => {
  it('returns the event ID until its entrance plays', () => {
    const entrances = createSocialFeedEntrances();
    const { result } = renderHook(() =>
      useSocialFeedEntranceEventId(entrances, 'event-1'),
    );
    const pending = result.current;

    act(() => entrances.markPlayed('event-1'));

    expect(pending).toBe('event-1');
    expect(result.current).toBeUndefined();
  });

  it('returns nothing for a post without an entrance', () => {
    const entrances = createSocialFeedEntrances();

    const { result } = renderHook(() =>
      useSocialFeedEntranceEventId(entrances, undefined),
    );

    expect(result.current).toBeUndefined();
  });
});
