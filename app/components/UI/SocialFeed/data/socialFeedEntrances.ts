import { useCallback, useSyncExternalStore } from 'react';

/**
 * Realtime entrances that already played, keyed by socket event id. Kept out
 * of the feed rows so finishing an entrance re-renders only the row that
 * played it: the list's `data` and `renderItem` stay the same.
 */
export interface SocialFeedEntrances {
  hasPlayed: (eventId: string) => boolean;
  subscribe: (eventId: string, listener: () => void) => () => void;
  /** Records the entrance as played, so a remounted row does not replay it. */
  markPlayed: (eventId: string) => void;
  /** Forgets played entrances whose event id is not in `eventIds`. */
  retain: (eventIds: ReadonlySet<string>) => void;
}

export const createSocialFeedEntrances = (): SocialFeedEntrances => {
  const played = new Set<string>();
  const listeners = new Map<string, Set<() => void>>();
  const notify = (eventId: string) => {
    listeners.get(eventId)?.forEach((listener) => listener());
  };

  return {
    hasPlayed: (eventId) => played.has(eventId),
    subscribe: (eventId, listener) => {
      const eventListeners = listeners.get(eventId) ?? new Set();
      eventListeners.add(listener);
      listeners.set(eventId, eventListeners);
      return () => {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          listeners.delete(eventId);
        }
      };
    },
    markPlayed: (eventId) => {
      if (played.has(eventId)) {
        return;
      }
      played.add(eventId);
      notify(eventId);
    },
    retain: (eventIds) => {
      [...played].forEach((eventId) => {
        if (!eventIds.has(eventId)) {
          played.delete(eventId);
          notify(eventId);
        }
      });
    },
  };
};

const noopUnsubscribe = () => undefined;

/** `eventId` while its entrance has yet to play, then `undefined`. */
export const useSocialFeedEntranceEventId = (
  entrances: SocialFeedEntrances,
  eventId: string | undefined,
): string | undefined => {
  const subscribe = useCallback(
    (listener: () => void) =>
      eventId ? entrances.subscribe(eventId, listener) : noopUnsubscribe,
    [entrances, eventId],
  );
  const getSnapshot = useCallback(
    () => (eventId && !entrances.hasPlayed(eventId) ? eventId : undefined),
    [entrances, eventId],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
};
