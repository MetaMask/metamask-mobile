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
    onSwipeToNextPage: jest.fn(),
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
    it('disables pager scrolling on the first page', () => {
      const { result } = renderHook(() =>
        useFirstPageSwipeGesture({
          isOnFirstPage: true,
          hasMultiplePages: true,
          onSwipeBack: jest.fn(),
          onSwipeToNextPage: jest.fn(),
        }),
      );

      expect(result.current.isPagerScrollEnabled).toBe(false);
    });

    it('enables pager scrolling past the first page', () => {
      const { result } = renderHook(() =>
        useFirstPageSwipeGesture({
          isOnFirstPage: false,
          hasMultiplePages: true,
          onSwipeBack: jest.fn(),
          onSwipeToNextPage: jest.fn(),
        }),
      );

      expect(result.current.isPagerScrollEnabled).toBe(true);
    });

    it('moves to the next page on a left swipe', async () => {
      const { onSwipeToNextPage, onSwipeBack } = renderHarness();

      await swipe(-80, -600);

      expect(onSwipeToNextPage).toHaveBeenCalledTimes(1);
      expect(onSwipeBack).not.toHaveBeenCalled();
    });

    it('ignores a short, slow left swipe', async () => {
      const { onSwipeToNextPage } = renderHarness();

      await swipe(-30, -100);

      expect(onSwipeToNextPage).not.toHaveBeenCalled();
    });

    it('leaves right swipes to the native back gesture', async () => {
      const { onSwipeToNextPage, onSwipeBack } = renderHarness();

      await swipe(80, 600);

      expect(onSwipeBack).not.toHaveBeenCalled();
      expect(onSwipeToNextPage).not.toHaveBeenCalled();
    });
  });

  describe('on Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('keeps pager scrolling enabled on the first page', () => {
      const { result } = renderHook(() =>
        useFirstPageSwipeGesture({
          isOnFirstPage: true,
          hasMultiplePages: true,
          onSwipeBack: jest.fn(),
          onSwipeToNextPage: jest.fn(),
        }),
      );

      expect(result.current.isPagerScrollEnabled).toBe(true);
    });

    it('swipes back on a right swipe', async () => {
      const { onSwipeBack, onSwipeToNextPage } = renderHarness();

      await swipe(80, 600);

      expect(onSwipeBack).toHaveBeenCalledTimes(1);
      expect(onSwipeToNextPage).not.toHaveBeenCalled();
    });

    it('swipes back on a right swipe when there is a single page', async () => {
      const { onSwipeBack } = renderHarness({ hasMultiplePages: false });

      await swipe(80, 600);

      expect(onSwipeBack).toHaveBeenCalledTimes(1);
    });

    it('leaves left swipes to the pager', async () => {
      const { onSwipeBack, onSwipeToNextPage } = renderHarness();

      await swipe(-80, -600);

      expect(onSwipeBack).not.toHaveBeenCalled();
      expect(onSwipeToNextPage).not.toHaveBeenCalled();
    });
  });

  it('disables pager scrolling when there is a single page', () => {
    const { result } = renderHook(() =>
      useFirstPageSwipeGesture({
        isOnFirstPage: true,
        hasMultiplePages: false,
        onSwipeBack: jest.fn(),
        onSwipeToNextPage: jest.fn(),
      }),
    );

    expect(result.current.isPagerScrollEnabled).toBe(false);
  });
});
