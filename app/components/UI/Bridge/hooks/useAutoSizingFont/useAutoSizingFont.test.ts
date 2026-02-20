import { renderHook, act } from '@testing-library/react-native';
import {
  useAutoSizingFont,
  calculateFontSizeForWidth,
  getTextWidthRatio,
} from '.';

describe('getTextWidthRatio', () => {
  it('returns 0 for empty string', () => {
    expect(getTextWidthRatio('')).toBe(0);
  });

  it('uses digit ratio (0.6) for numeric characters', () => {
    expect(getTextWidthRatio('1')).toBeCloseTo(0.6);
    expect(getTextWidthRatio('12')).toBeCloseTo(1.2);
    expect(getTextWidthRatio('12345')).toBeCloseTo(3.0);
  });

  it('uses narrow ratio (0.3) for periods and commas', () => {
    expect(getTextWidthRatio('.')).toBeCloseTo(0.3);
    expect(getTextWidthRatio(',')).toBeCloseTo(0.3);
    expect(getTextWidthRatio('.,')).toBeCloseTo(0.6);
  });

  it('combines digit and narrow character ratios correctly', () => {
    // "1.5" = 2 digits (0.6 each) + 1 period (0.3) = 1.5
    expect(getTextWidthRatio('1.5')).toBeCloseTo(1.5);
    // "0.88888855" = 9 digits (5.4) + 1 period (0.3) = 5.7
    expect(getTextWidthRatio('0.88888855')).toBeCloseTo(5.7);
  });

  it('uses default ratio (0.6) for non-digit, non-narrow characters', () => {
    expect(getTextWidthRatio('a')).toBeCloseTo(0.6);
    expect(getTextWidthRatio('ETH')).toBeCloseTo(1.8);
  });
});

describe('calculateFontSizeForWidth', () => {
  it('returns maxFontSize when text is empty', () => {
    expect(calculateFontSizeForWidth('', 300)).toBe(40);
    expect(calculateFontSizeForWidth('', 300, 50)).toBe(50);
  });

  it('returns maxFontSize when containerWidth is 0', () => {
    expect(calculateFontSizeForWidth('123', 0)).toBe(40);
  });

  it('calculates font size for short text in wide container', () => {
    // "0" has ratio 0.6
    // idealFontSize = (300 * 0.95) / 0.6 = 475 → clamped to 40
    expect(calculateFontSizeForWidth('0', 300)).toBe(40);
  });

  it('reduces font size for longer text', () => {
    // "0.88888855" has ratio 5.7
    // idealFontSize = (220 * 0.95) / 5.7 ≈ 36.6 → floor to 36
    const fontSize = calculateFontSizeForWidth('0.88888855', 220);
    expect(fontSize).toBe(36);
  });

  it('clamps to minFontSize for very long text', () => {
    // Very long text that would need tiny font
    const longText = '1234567890.123456789012345';
    expect(calculateFontSizeForWidth(longText, 100)).toBe(20);
  });

  it('respects custom min and max bounds', () => {
    expect(calculateFontSizeForWidth('0', 300, 30, 12)).toBe(30);
    expect(
      calculateFontSizeForWidth('1234567890.123456789012345', 100, 30, 12),
    ).toBe(12);
  });

  it('correctly sizes text with many narrow characters', () => {
    // "1,234,567.89" = 9 digits (5.4) + 3 narrow chars (0.9) = 6.3
    // idealFontSize = (250 * 0.95) / 6.3 ≈ 37.7 → floor to 37
    const fontSize = calculateFontSizeForWidth('1,234,567.89', 250);
    expect(fontSize).toBe(37);
  });
});

describe('useAutoSizingFont', () => {
  it('returns maxFontSize before layout measurement', () => {
    const { result } = renderHook(() =>
      useAutoSizingFont({ text: '0.88888855' }),
    );

    expect(result.current.fontSize).toBe(40);
    expect(typeof result.current.onContainerLayout).toBe('function');
  });

  it('calculates font size after layout measurement', () => {
    const { result } = renderHook(() =>
      useAutoSizingFont({ text: '0.88888855' }),
    );

    act(() => {
      result.current.onContainerLayout({
        nativeEvent: { layout: { width: 220, height: 50, x: 0, y: 0 } },
      } as never);
    });

    // ratio for "0.88888855" = 5.7
    // idealFontSize = (220 * 0.95) / 5.7 ≈ 36.6 → 36
    expect(result.current.fontSize).toBe(36);
  });

  it('returns maxFontSize for short text in wide container', () => {
    const { result } = renderHook(() => useAutoSizingFont({ text: '5' }));

    act(() => {
      result.current.onContainerLayout({
        nativeEvent: { layout: { width: 300, height: 50, x: 0, y: 0 } },
      } as never);
    });

    expect(result.current.fontSize).toBe(40);
  });

  it('respects custom maxFontSize and minFontSize', () => {
    const { result } = renderHook(() =>
      useAutoSizingFont({
        text: '0.88888855',
        maxFontSize: 50,
        minFontSize: 20,
      }),
    );

    // Before layout, uses maxFontSize
    expect(result.current.fontSize).toBe(50);

    // Very narrow container should clamp to minFontSize
    act(() => {
      result.current.onContainerLayout({
        nativeEvent: { layout: { width: 50, height: 50, x: 0, y: 0 } },
      } as never);
    });

    expect(result.current.fontSize).toBe(20);
  });

  it('updates font size when text changes', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useAutoSizingFont({ text }),
      { initialProps: { text: '1' } },
    );

    act(() => {
      result.current.onContainerLayout({
        nativeEvent: { layout: { width: 220, height: 50, x: 0, y: 0 } },
      } as never);
    });

    expect(result.current.fontSize).toBe(40); // Short text: clamped to max

    rerender({ text: '0.88888855' });
    expect(result.current.fontSize).toBe(36);

    rerender({ text: '12345678901234567890' });
    // ratio = 20 * 0.6 = 12
    // idealFontSize = (220 * 0.95) / 12 ≈ 17.4 → clamped to min 20
    expect(result.current.fontSize).toBe(20);
  });

  it('uses maxFontSize for empty text (placeholder scenario)', () => {
    const { result } = renderHook(() => useAutoSizingFont({ text: '0' }));

    act(() => {
      result.current.onContainerLayout({
        nativeEvent: { layout: { width: 220, height: 50, x: 0, y: 0 } },
      } as never);
    });

    expect(result.current.fontSize).toBe(40);
  });
});
