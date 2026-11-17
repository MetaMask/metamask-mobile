import { useCallback, useRef, useState } from 'react';

/**
 * Which page of a tab view is active. Tapping back to a page that was already
 * opened waits for the pager to stop (`onPagerRest`, from `onSwipeEnd`) so the
 * page doesn't resume mid-animation. Anything else activates right away.
 */
const usePageActivation = (initialIndex: number) => {
  const [pageActiveIndex, setPageActiveIndex] = useState(initialIndex);
  const visitedIndexesRef = useRef(new Set([initialIndex]));
  const pendingIndexRef = useRef<number | null>(null);

  const activate = useCallback((index: number, isTap = false) => {
    const shouldWait = isTap && visitedIndexesRef.current.has(index);
    visitedIndexesRef.current.add(index);
    pendingIndexRef.current = shouldWait ? index : null;
    if (!shouldWait) {
      setPageActiveIndex(index);
    }
  }, []);

  const onPagerRest = useCallback(() => {
    if (pendingIndexRef.current !== null) {
      setPageActiveIndex(pendingIndexRef.current);
      pendingIndexRef.current = null;
    }
  }, []);

  return { pageActiveIndex, activate, onPagerRest };
};

export default usePageActivation;
