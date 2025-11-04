import { useRef, useCallback } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedScrollHandler,
  cancelAnimation,
} from 'react-native-reanimated';
import { PredictCategory } from '../types';

export const useSharedScrollCoordinator = () => {
  const balanceCardOffset = useSharedValue(0);
  const balanceCardHeight = useSharedValue(0);
  const isCardVisible = useSharedValue(true);
  const lastScrollY = useSharedValue(0);
  const tabScrollPositionsRef = useRef<Map<PredictCategory, number>>(new Map());

  const setBalanceCardHeight = useCallback(
    (height: number) => {
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

  // Scroll handler: show card only when scrolling UP to top, hide when scrolling down
  // Using large hysteresis zone and direction tracking to prevent flickering
  const trendingScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeight.value;
      const previousY = lastScrollY.value;
      const isScrollingUp = scrollY < previousY;

      if (cardHeight > 0) {
        // Only show card when scrolling UP and near top
        if (scrollY < 5 && isScrollingUp && !isCardVisible.value) {
          isCardVisible.value = true;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
        }
        // Hide card when scrolled down (regardless of direction)
        else if (scrollY > 100 && isCardVisible.value) {
          isCardVisible.value = false;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(-cardHeight, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
        }
      }

      lastScrollY.value = scrollY;
    },
  });

  const newScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeight.value;
      const previousY = lastScrollY.value;
      const isScrollingUp = scrollY < previousY;

      if (cardHeight > 0) {
        if (scrollY < 5 && isScrollingUp && !isCardVisible.value) {
          isCardVisible.value = true;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
        } else if (scrollY > 100 && isCardVisible.value) {
          isCardVisible.value = false;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(-cardHeight, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
        }
      }

      lastScrollY.value = scrollY;
    },
  });

  const sportsScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeight.value;
      const previousY = lastScrollY.value;
      const isScrollingUp = scrollY < previousY;

      if (cardHeight > 0) {
        if (scrollY < 5 && isScrollingUp && !isCardVisible.value) {
          isCardVisible.value = true;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
        } else if (scrollY > 100 && isCardVisible.value) {
          isCardVisible.value = false;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(-cardHeight, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
        }
      }

      lastScrollY.value = scrollY;
    },
  });

  const cryptoScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeight.value;
      const previousY = lastScrollY.value;
      const isScrollingUp = scrollY < previousY;

      if (cardHeight > 0) {
        if (scrollY < 5 && isScrollingUp && !isCardVisible.value) {
          isCardVisible.value = true;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
        } else if (scrollY > 100 && isCardVisible.value) {
          isCardVisible.value = false;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(-cardHeight, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
        }
      }

      lastScrollY.value = scrollY;
    },
  });

  const politicsScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const scrollY = event.contentOffset.y;
      const cardHeight = balanceCardHeight.value;
      const previousY = lastScrollY.value;
      const isScrollingUp = scrollY < previousY;

      if (cardHeight > 0) {
        if (scrollY < 5 && isScrollingUp && !isCardVisible.value) {
          isCardVisible.value = true;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
        } else if (scrollY > 100 && isCardVisible.value) {
          isCardVisible.value = false;
          cancelAnimation(balanceCardOffset);
          balanceCardOffset.value = withTiming(-cardHeight, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
        }
      }

      lastScrollY.value = scrollY;
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
