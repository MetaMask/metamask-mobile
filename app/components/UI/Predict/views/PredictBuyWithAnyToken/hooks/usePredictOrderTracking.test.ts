import { renderHook } from '@testing-library/react-native';
import { usePredictOrderTracking } from './usePredictOrderTracking';

interface Result {
  success: boolean;
}

describe('usePredictOrderTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onSuccess callback', () => {
    it('calls onSuccess when result.success is true', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const result: Result = { success: true };

      // Act
      renderHook(() =>
        usePredictOrderTracking({
          result,
          onSuccess,
          error: undefined,
          onError,
        }),
      );

      // Assert
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when result is null', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Act
      renderHook(() =>
        usePredictOrderTracking({
          result: null,
          onSuccess,
          error: undefined,
          onError,
        }),
      );

      // Assert
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when result.success is false', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const result: Result = { success: false };

      // Act
      renderHook(() =>
        usePredictOrderTracking({
          result,
          onSuccess,
          error: undefined,
          onError,
        }),
      );

      // Assert
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('calls onSuccess only once on rerender with same result', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const result: Result = { success: true };

      // Act
      const { rerender } = renderHook(
        ({ result: r, onSuccess: os, error: e, onError: oe }) =>
          usePredictOrderTracking({
            result: r,
            onSuccess: os,
            error: e,
            onError: oe,
          }),
        {
          initialProps: {
            result,
            onSuccess,
            error: undefined,
            onError,
          },
        },
      );

      rerender({
        result,
        onSuccess,
        error: undefined,
        onError,
      });

      // Assert
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('onError callback', () => {
    it('calls onError when error is truthy string', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const error = 'Something went wrong';

      // Act
      renderHook(() =>
        usePredictOrderTracking({
          result: null,
          onSuccess,
          error,
          onError,
        }),
      );

      // Assert
      expect(onError).toHaveBeenCalledWith(error);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('does not call onError when error is undefined', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Act
      renderHook(() =>
        usePredictOrderTracking({
          result: null,
          onSuccess,
          error: undefined,
          onError,
        }),
      );

      // Assert
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('calls onError only once on rerender with same error', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const error = 'Network error';

      // Act
      const { rerender } = renderHook(
        ({ result: r, onSuccess: os, error: e, onError: oe }) =>
          usePredictOrderTracking({
            result: r,
            onSuccess: os,
            error: e,
            onError: oe,
          }),
        {
          initialProps: {
            result: null,
            onSuccess,
            error,
            onError,
          },
        },
      );

      rerender({
        result: null,
        onSuccess,
        error,
        onError,
      });

      // Assert
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('combined scenarios', () => {
    it('calls both onSuccess and onError when both result.success and error are present', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const result: Result = { success: true };
      const error = 'Error occurred';

      // Act
      renderHook(() =>
        usePredictOrderTracking({
          result,
          onSuccess,
          error,
          onError,
        }),
      );

      // Assert
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('does not call either callback when result is null and error is undefined', () => {
      // Arrange
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Act
      renderHook(() =>
        usePredictOrderTracking({
          result: null,
          onSuccess,
          error: undefined,
          onError,
        }),
      );

      // Assert
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
