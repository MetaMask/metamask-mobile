import { useContext, useEffect, useState } from 'react';
import { SocialFeedPageActiveContext } from '../components/SocialFeedPageActiveContext';

export const FEED_AGE_TICK_MS = 60_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  timer ??= setInterval(
    () => listeners.forEach((notify) => notify()),
    FEED_AGE_TICK_MS,
  );
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};

export const useFeedAgeNow = (pinnedNow?: number): number => {
  const isPageActive = useContext(SocialFeedPageActiveContext);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (pinnedNow !== undefined || !isPageActive) {
      return undefined;
    }
    return subscribe(() => setNow(Date.now()));
  }, [isPageActive, pinnedNow]);

  return pinnedNow ?? now;
};
