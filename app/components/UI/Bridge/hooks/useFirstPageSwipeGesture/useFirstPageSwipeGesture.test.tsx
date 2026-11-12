import React from 'react';
import { Platform, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { act, render, renderHook } from '@testing-library/react-native';
import {
  useFirstPageSwipeGesture,
  type UseFirstPageSwipeGestureOptions,
} from './index';

const GESTURE_TEST_ID = 'first-page-swipe-gesture';

const Harness = (options: UseFirstPageSwipeGestureOptions) => {
  const { gesture } = useFirstPageSwipeGesture(options);
  return (
    <GestureDetector gesture={gesture}>
      <View />
    </GestureDetector>
  );
};

const renderHarness = (
  overrides: Partial<UseFirstPageSwipeGestureOptions> = {},
) => {
  const options = {
    isOnFirstPage: true,
    hasMultiplePages: true,
    onSwipeBack: jest.fn(),
    testID: GESTURE_TEST_ID,
    ...overrides,
  };
  render(<Harness {...options} />);
  return options;
};

const swipe = async (translationX: number, velocityX = 0) => {
  await act(async () => {
    fireGestureHandler(getByGestureTestId(GESTURE_TEST_ID), [
      { translationX, velocityX },
    ]);
    await Promise.resolve();
  });
};

describe('useFirstPageSwipeGesture', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('on iOS', () => {
    it('keeps pager scrolling enabled and shows the back gesture edge on the first page', () => {
      const { result } = renderHook(() =>
        useFirstPageSwipeGesture({
          isOnFirstPage: true,
          hasMultiplePages: true,
          onSwipeBack: jest.fn(),
        }),
      );

      expect(result.current.isPagerScrollEnabled).toBe(true);
      expect(result.current.isBackGestureEdgeVisible).toBe(true);
    });

    it('hides the back gesture edge past the first page', () => {
      const { result } = renderHook(() =>
        useFirstPageSwipeGesture({
          isOnFirstPage: false,
          hasMultiplePages: true,
          onSwipeBack: jest.fn(),
        }),
      );

      expect(result.current.isPagerScrollEnabled).toBe(true);
      expect(result.current.isBackGestureEdgeVisible).toBe(false);
    });

    it('hides the back gesture edge when there is a single page', () => {
      const { result } = renderHook(() =>
        useFirstPageSwipeGesture({
          isOnFirstPage: true,
          hasMultiplePages: false,
          onSwipeBack: jest.fn(),
        }),
      );

      expect(result.current.isBackGestureEdgeVisible).toBe(false);
    });

    it('leaves right swipes to the native back gesture', async () => {
      const { onSwipeBack } = renderHarness();

      await swipe(80, 600);

      expect(onSwipeBack).not.toHaveBeenCalled();
    });
  });

  describe('on Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('keeps pager scrolling enabled without a back gesture edge on the first page', () => {
      const { result } = renderHook(() =>
        useFirstPageSwipeGesture({
          isOnFirstPage: true,
          hasMultiplePages: true,
          onSwipeBack: jest.fn(),
        }),
      );

      expect(result.current.isPagerScrollEnabled).toBe(true);
      expect(result.current.isBackGestureEdgeVisible).toBe(false);
    });

    it('swipes back on a right swipe', async () => {
      const { onSwipeBack } = renderHarness();

      await swipe(80, 600);

      expect(onSwipeBack).toHaveBeenCalledTimes(1);
    });

    it('ignores a short, slow right swipe', async () => {
      const { onSwipeBack } = renderHarness();

      await swipe(30, 100);

      expect(onSwipeBack).not.toHaveBeenCalled();
    });

    it('does not swipe back past the first page', async () => {
      const { onSwipeBack } = renderHarness({ isOnFirstPage: false });

      await swipe(80, 600);

      expect(onSwipeBack).not.toHaveBeenCalled();
    });

    it('swipes back on a right swipe when there is a single page', async () => {
      const { onSwipeBack } = renderHarness({ hasMultiplePages: false });

      await swipe(80, 600);

      expect(onSwipeBack).toHaveBeenCalledTimes(1);
    });

    it('leaves left swipes to the pager', async () => {
      const { onSwipeBack } = renderHarness();

      await swipe(-80, -600);

      expect(onSwipeBack).not.toHaveBeenCalled();
    });
  });

  it('disables pager scrolling when there is a single page', () => {
    const { result } = renderHook(() =>
      useFirstPageSwipeGesture({
        isOnFirstPage: true,
        hasMultiplePages: false,
        onSwipeBack: jest.fn(),
      }),
    );

    expect(result.current.isPagerScrollEnabled).toBe(false);
  });
});
