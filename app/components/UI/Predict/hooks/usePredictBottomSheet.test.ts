import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictBottomSheet } from './usePredictBottomSheet';
import { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import { MutableRefObject } from 'react';

describe('usePredictBottomSheet', () => {
  let mockOnDismiss: jest.Mock;
  let mockBottomSheetRef: jest.Mocked<BottomSheetRef>;

  const setRefCurrent = (
    ref: MutableRefObject<BottomSheetRef | null>,
    value: BottomSheetRef | null,
  ) => {
    Object.defineProperty(ref, 'current', {
      writable: true,
      value,
    });
  };

  beforeEach(() => {
    mockOnDismiss = jest.fn();
    mockBottomSheetRef = {
      onOpenBottomSheet: jest.fn(),
      onCloseBottomSheet: jest.fn(),
    } as jest.Mocked<BottomSheetRef>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initial state', () => {
    it('returns isVisible as false', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      expect(result.current.isVisible).toBe(false);
    });

    it('returns sheetRef with null current value', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      expect(result.current.sheetRef.current).toBeNull();
    });

    it('returns all expected functions', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      expect(result.current.closeSheet).toBeDefined();
      expect(result.current.handleSheetClosed).toBeDefined();
      expect(result.current.getRefHandlers).toBeDefined();
    });
  });

  describe('getRefHandlers', () => {
    describe('onOpenBottomSheet', () => {
      it('sets isVisible to true when sheet is not visible', () => {
        const { result } = renderHook(() => usePredictBottomSheet());

        act(() => {
          const handlers = result.current.getRefHandlers();
          handlers.onOpenBottomSheet();
        });

        expect(result.current.isVisible).toBe(true);
      });

      it('does nothing when sheet is already visible', () => {
        const { result } = renderHook(() => usePredictBottomSheet());
        setRefCurrent(result.current.sheetRef, mockBottomSheetRef);

        act(() => {
          const handlers = result.current.getRefHandlers();
          handlers.onOpenBottomSheet();
        });

        act(() => {
          const handlers = result.current.getRefHandlers();
          handlers.onOpenBottomSheet();
        });

        expect(result.current.isVisible).toBe(true);
        expect(mockBottomSheetRef.onOpenBottomSheet).not.toHaveBeenCalled();
      });

      it('does not call sheetRef.current.onOpenBottomSheet when ref is null', () => {
        const { result } = renderHook(() => usePredictBottomSheet());

        act(() => {
          const handlers = result.current.getRefHandlers();
          handlers.onOpenBottomSheet();
        });

        expect(result.current.isVisible).toBe(true);
      });
    });

    describe('onCloseBottomSheet', () => {
      it('calls closeSheet when invoked', () => {
        const { result } = renderHook(() =>
          usePredictBottomSheet({ onDismiss: mockOnDismiss }),
        );
        setRefCurrent(result.current.sheetRef, mockBottomSheetRef);

        act(() => {
          const handlers = result.current.getRefHandlers();
          handlers.onCloseBottomSheet();
        });

        expect(mockBottomSheetRef.onCloseBottomSheet).toHaveBeenCalled();
      });
    });
  });

  describe('closeSheet', () => {
    it('sets isVisible to false when sheetRef.current is null', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      act(() => {
        const handlers = result.current.getRefHandlers();
        handlers.onOpenBottomSheet();
      });

      act(() => {
        result.current.closeSheet();
      });

      expect(result.current.isVisible).toBe(false);
    });

    it('calls onDismiss when sheetRef.current is null', () => {
      const { result } = renderHook(() =>
        usePredictBottomSheet({ onDismiss: mockOnDismiss }),
      );

      act(() => {
        result.current.closeSheet();
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls sheetRef.current.onCloseBottomSheet when ref exists', () => {
      const { result } = renderHook(() => usePredictBottomSheet());
      setRefCurrent(result.current.sheetRef, mockBottomSheetRef);

      act(() => {
        result.current.closeSheet();
      });

      expect(mockBottomSheetRef.onCloseBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('sets isVisible to false when sheetRef callback is invoked', () => {
      const { result } = renderHook(() => usePredictBottomSheet());
      setRefCurrent(result.current.sheetRef, mockBottomSheetRef);
      mockBottomSheetRef.onCloseBottomSheet.mockImplementation((callback) => {
        if (callback) {
          callback();
        }
      });

      act(() => {
        const handlers = result.current.getRefHandlers();
        handlers.onOpenBottomSheet();
      });

      act(() => {
        result.current.closeSheet();
      });

      expect(result.current.isVisible).toBe(false);
    });

    it('does not call onDismiss when sheetRef.current exists', () => {
      const { result } = renderHook(() =>
        usePredictBottomSheet({ onDismiss: mockOnDismiss }),
      );
      setRefCurrent(result.current.sheetRef, mockBottomSheetRef);

      act(() => {
        result.current.closeSheet();
      });

      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('handleSheetClosed', () => {
    it('sets isVisible to false', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      act(() => {
        const handlers = result.current.getRefHandlers();
        handlers.onOpenBottomSheet();
      });

      act(() => {
        result.current.handleSheetClosed();
      });

      expect(result.current.isVisible).toBe(false);
    });

    it('calls onDismiss when provided', () => {
      const { result } = renderHook(() =>
        usePredictBottomSheet({ onDismiss: mockOnDismiss }),
      );

      act(() => {
        result.current.handleSheetClosed();
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not throw error when onDismiss is not provided', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      expect(() => {
        act(() => {
          result.current.handleSheetClosed();
        });
      }).not.toThrow();
    });

    it('does not call closeSheet', () => {
      const { result } = renderHook(() =>
        usePredictBottomSheet({ onDismiss: mockOnDismiss }),
      );
      setRefCurrent(result.current.sheetRef, mockBottomSheetRef);

      act(() => {
        result.current.handleSheetClosed();
      });

      expect(mockBottomSheetRef.onCloseBottomSheet).not.toHaveBeenCalled();
    });
  });

  describe('visibility state', () => {
    it('does not call sheetRef methods when opening (BottomSheet auto-opens on mount)', () => {
      const { result } = renderHook(() => usePredictBottomSheet());
      setRefCurrent(result.current.sheetRef, mockBottomSheetRef);

      act(() => {
        const handlers = result.current.getRefHandlers();
        handlers.onOpenBottomSheet();
      });

      expect(result.current.isVisible).toBe(true);
      expect(mockBottomSheetRef.onOpenBottomSheet).not.toHaveBeenCalled();
    });

    it('does not call sheetRef.current.onOpenBottomSheet when isVisible is false', () => {
      const { result } = renderHook(() => usePredictBottomSheet());
      setRefCurrent(result.current.sheetRef, mockBottomSheetRef);

      expect(mockBottomSheetRef.onOpenBottomSheet).not.toHaveBeenCalled();
    });

    it('does not throw when sheetRef.current is null and isVisible becomes true', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      expect(() => {
        act(() => {
          const handlers = result.current.getRefHandlers();
          handlers.onOpenBottomSheet();
        });
      }).not.toThrow();
    });
  });

  describe('params handling', () => {
    it('works without params', () => {
      const { result } = renderHook(() => usePredictBottomSheet());

      expect(result.current.isVisible).toBe(false);
    });

    it('works with empty params object', () => {
      const { result } = renderHook(() => usePredictBottomSheet({}));

      expect(result.current.isVisible).toBe(false);
    });

    it('uses provided onDismiss callback', () => {
      const { result } = renderHook(() =>
        usePredictBottomSheet({ onDismiss: mockOnDismiss }),
      );

      act(() => {
        result.current.handleSheetClosed();
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
