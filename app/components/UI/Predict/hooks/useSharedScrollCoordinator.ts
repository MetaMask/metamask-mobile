import { useRef, useCallback } from 'react';
import {
  useSharedValue,
  runOnJS,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { PredictCategory } from '../types';

export const useSharedScrollCoordinator = () => {
  const balanceCardOffset = useSharedValue(0);
  const balanceCardHeight = useSharedValue(0);
  const balanceCardHeightRef = useRef(0);
  const tabScrollPositionsRef = useRef<Map<PredictCategory, number>>(new Map());

  const setBalanceCardHeight = useCallback(
    (height: number) => {
      balanceCardHeightRef.current = height;
      balanceCardHeight.value = height;
    },
    [balanceCardHeight],
  );

  const setCurrentCategory = useCallback((_category: PredictCategory) => {
    // No-op for now, can be used for future enhancements
  }, []);

  const getTabScrollPosition = useCallback(
    (category: PredictCategory): number =>
      tabScrollPositionsRef.current.get(category) || 0,
    [],
  );

  const setTabScrollPosition = useCallback(
    (category: PredictCategory, position: number) => {
      tabScrollPositionsRef.current.set(category, position);
    },
    [],
  );

  const updateBalanceCardVisibility = useCallback((_hidden: boolean) => {
    // No-op for now, can be used for future enhancements
  }, []);

  const trendingScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeightRef.current;

      if (cardHeight > 0) {
        const newOffset = Math.max(-cardHeight, Math.min(0, -scrollY));
        balanceCardOffset.value = newOffset;
      }

      runOnJS(setTabScrollPosition)('trending', Math.max(0, scrollY));
    },
  });

  const newScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeightRef.current;

      if (cardHeight > 0) {
        const newOffset = Math.max(-cardHeight, Math.min(0, -scrollY));
        balanceCardOffset.value = newOffset;
      }

      runOnJS(setTabScrollPosition)('new', Math.max(0, scrollY));
    },
  });

  const sportsScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeightRef.current;

      if (cardHeight > 0) {
        const newOffset = Math.max(-cardHeight, Math.min(0, -scrollY));
        balanceCardOffset.value = newOffset;
      }

      runOnJS(setTabScrollPosition)('sports', Math.max(0, scrollY));
    },
  });

  const cryptoScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeightRef.current;

      if (cardHeight > 0) {
        const newOffset = Math.max(-cardHeight, Math.min(0, -scrollY));
        balanceCardOffset.value = newOffset;
      }

      runOnJS(setTabScrollPosition)('crypto', Math.max(0, scrollY));
    },
  });

  const politicsScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeightRef.current;

      if (cardHeight > 0) {
        const newOffset = Math.max(-cardHeight, Math.min(0, -scrollY));
        balanceCardOffset.value = newOffset;
      }

      runOnJS(setTabScrollPosition)('politics', Math.max(0, scrollY));
    },
  });

  const getScrollHandler = useCallback(
    (category: PredictCategory) => {
      switch (category) {
        case 'trending':
          return trendingScrollHandler;
        case 'new':
          return newScrollHandler;
        case 'sports':
          return sportsScrollHandler;
        case 'crypto':
          return cryptoScrollHandler;
        case 'politics':
          return politicsScrollHandler;
        default:
          return trendingScrollHandler;
      }
    },
    [
      trendingScrollHandler,
      newScrollHandler,
      sportsScrollHandler,
      cryptoScrollHandler,
      politicsScrollHandler,
    ],
  );

  return {
    balanceCardOffset,
    balanceCardHeight,
    setBalanceCardHeight,
    setCurrentCategory,
    getTabScrollPosition,
    setTabScrollPosition,
    getScrollHandler,
    isBalanceCardHidden: () => false,
    updateBalanceCardHiddenState: updateBalanceCardVisibility,
  };
};
