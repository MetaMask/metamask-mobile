import { renderHook, act } from '@testing-library/react-native';
import { usePositionManagement } from './usePositionManagement';
import type { Position } from '../controllers/types';

describe('usePositionManagement', () => {
  const mockPosition: Position = {
    coin: 'ETH',
    size: '2.5',
    marginUsed: '500',
    entryPrice: '2000',
    liquidationPrice: '1900',
    unrealizedPnl: '100',
    returnOnEquity: '0.20',
    leverage: { value: 10, type: 'isolated' },
    cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
    positionValue: '5000',
    maxLeverage: 50,
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  it('returns initial state with all sheets hidden', () => {
    const { result } = renderHook(() => usePositionManagement());

    expect(result.current.showModifyActionSheet).toBe(false);
    expect(result.current.showAdjustMarginActionSheet).toBe(false);
    expect(result.current.showReversePositionSheet).toBe(false);
  });

  it('returns refs for all bottom sheets', () => {
    const { result } = renderHook(() => usePositionManagement());

    expect(result.current.modifyActionSheetRef).toBeDefined();
    expect(result.current.modifyActionSheetRef.current).toBeNull();
    expect(result.current.adjustMarginActionSheetRef).toBeDefined();
    expect(result.current.adjustMarginActionSheetRef.current).toBeNull();
    expect(result.current.reversePositionSheetRef).toBeDefined();
    expect(result.current.reversePositionSheetRef.current).toBeNull();
  });

  describe('modify action sheet', () => {
    it('opens modify sheet when openModifySheet is called', () => {
      const { result } = renderHook(() => usePositionManagement());

      act(() => {
        result.current.openModifySheet();
      });

      expect(result.current.showModifyActionSheet).toBe(true);
    });

    it('closes modify sheet when closeModifySheet is called', () => {
      const { result } = renderHook(() => usePositionManagement());

      act(() => {
        result.current.openModifySheet();
      });

      expect(result.current.showModifyActionSheet).toBe(true);

      act(() => {
        result.current.closeModifySheet();
      });

      expect(result.current.showModifyActionSheet).toBe(false);
    });
  });

  describe('adjust margin action sheet', () => {
    it('opens adjust margin sheet when openAdjustMarginSheet is called', () => {
      const { result } = renderHook(() => usePositionManagement());

      act(() => {
        result.current.openAdjustMarginSheet();
      });

      expect(result.current.showAdjustMarginActionSheet).toBe(true);
    });

    it('closes adjust margin sheet when closeAdjustMarginSheet is called', () => {
      const { result } = renderHook(() => usePositionManagement());

      act(() => {
        result.current.openAdjustMarginSheet();
      });

      expect(result.current.showAdjustMarginActionSheet).toBe(true);

      act(() => {
        result.current.closeAdjustMarginSheet();
      });

      expect(result.current.showAdjustMarginActionSheet).toBe(false);
    });
  });

  describe('reverse position sheet', () => {
    it('opens reverse position sheet when openReversePositionSheet is called', () => {
      const { result } = renderHook(() => usePositionManagement());

      act(() => {
        result.current.openReversePositionSheet();
      });

      expect(result.current.showReversePositionSheet).toBe(true);
    });

    it('closes reverse position sheet when closeReversePositionSheet is called', () => {
      const { result } = renderHook(() => usePositionManagement());

      act(() => {
        result.current.openReversePositionSheet();
      });

      expect(result.current.showReversePositionSheet).toBe(true);

      act(() => {
        result.current.closeReversePositionSheet();
      });

      expect(result.current.showReversePositionSheet).toBe(false);
    });

    it('opens reverse position sheet when handleReversePosition is called', () => {
      const { result } = renderHook(() => usePositionManagement());

      act(() => {
        result.current.handleReversePosition(mockPosition);
      });

      expect(result.current.showReversePositionSheet).toBe(true);
    });
  });

  describe('multiple sheets interaction', () => {
    it('can have only one sheet open at a time (conceptual - sheets are independent)', () => {
      const { result } = renderHook(() => usePositionManagement());

      // Open modify sheet
      act(() => {
        result.current.openModifySheet();
      });
      expect(result.current.showModifyActionSheet).toBe(true);

      // Open adjust margin sheet (in real usage, you'd close modify first)
      act(() => {
        result.current.closeModifySheet();
        result.current.openAdjustMarginSheet();
      });

      expect(result.current.showModifyActionSheet).toBe(false);
      expect(result.current.showAdjustMarginActionSheet).toBe(true);
    });
  });

  describe('with options', () => {
    it('accepts options without errors', () => {
      const mockOnNavigateToTPSL = jest.fn();
      const mockOnNavigateToAdjustMargin = jest.fn();
      const mockOnNavigateToClosePosition = jest.fn();

      const { result } = renderHook(() =>
        usePositionManagement({
          position: mockPosition,
          onNavigateToTPSL: mockOnNavigateToTPSL,
          onNavigateToAdjustMargin: mockOnNavigateToAdjustMargin,
          onNavigateToClosePosition: mockOnNavigateToClosePosition,
        }),
      );

      expect(result.current.showModifyActionSheet).toBe(false);
    });

    it('works with empty options', () => {
      const { result } = renderHook(() => usePositionManagement({}));

      expect(result.current.showModifyActionSheet).toBe(false);
      expect(result.current.openModifySheet).toBeDefined();
    });
  });
});
