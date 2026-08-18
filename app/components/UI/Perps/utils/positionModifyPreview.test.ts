import {
  formatBeforeAfterDisplay,
  getModifiedPositionPreview,
  type PositionModifyPreviewInput,
} from './positionModifyPreview';

const longPosition = {
  size: '1',
  marginUsed: '1000',
  liquidationPrice: '48000',
  entryPrice: '50000',
  leverage: { type: 'isolated' as const, value: 5 },
  maxLeverage: 50,
};

const shortPosition = {
  ...longPosition,
  size: '-1',
  liquidationPrice: '52000',
};

const baseInput = (
  overrides: Partial<PositionModifyPreviewInput> = {},
): PositionModifyPreviewInput => ({
  position: longPosition,
  orderDirection: 'long',
  orderSize: 0.1,
  orderMargin: 20,
  orderPrice: 90000,
  reduceOnly: false,
  ...overrides,
});

describe('formatBeforeAfterDisplay', () => {
  it('joins current and projected values with an arrow', () => {
    expect(formatBeforeAfterDisplay('$1,000', '$1,020')).toBe(
      '$1,000 → $1,020',
    );
  });
});

describe('getModifiedPositionPreview', () => {
  it('returns a non-modifying preview when there is no open position', () => {
    const result = getModifiedPositionPreview(baseInput({ position: null }));

    expect(result.isModifying).toBe(false);
    expect(result.kind).toBeNull();
  });

  it('returns a non-modifying preview when position fields are unusable', () => {
    const result = getModifiedPositionPreview(
      baseInput({
        position: { ...longPosition, marginUsed: 'not-a-number' },
      }),
    );

    expect(result.isModifying).toBe(false);
  });

  it('returns a non-modifying preview when liquidationPrice is null', () => {
    const result = getModifiedPositionPreview(
      baseInput({
        position: { ...longPosition, liquidationPrice: null },
      }),
    );

    expect(result.isModifying).toBe(false);
  });

  it('keeps current margin and size when order size is empty', () => {
    const result = getModifiedPositionPreview(baseInput({ orderSize: 0 }));

    expect(result).toEqual(
      expect.objectContaining({
        isModifying: true,
        kind: 'increase',
        currentMargin: 1000,
        newMargin: 1000,
        resultingSize: 1,
        resultingEntryPrice: 50000,
        resultingDirection: 'long',
        newLiquidationPrice: 48000,
      }),
    );
  });

  it('adds size and margin and averages entry when increasing a long', () => {
    const result = getModifiedPositionPreview(baseInput());

    expect(result.kind).toBe('increase');
    expect(result.isModifying).toBe(true);
    expect(result.currentMargin).toBe(1000);
    expect(result.newMargin).toBe(1020);
    expect(result.resultingSize).toBeCloseTo(1.1);
    expect(result.resultingEntryPrice).toBeCloseTo(
      (1 * 50000 + 0.1 * 90000) / 1.1,
    );
    expect(result.resultingDirection).toBe('long');
    expect(result.currentLiquidationPrice).toBe(48000);
    expect(result.newLiquidationPrice).toBeCloseTo(51746.56, 1);
  });

  it('releases margin proportionally when reducing a long with a short order', () => {
    const result = getModifiedPositionPreview(
      baseInput({
        orderDirection: 'short',
        orderSize: 0.4,
        reduceOnly: true,
      }),
    );

    expect(result.kind).toBe('decrease');
    expect(result.newMargin).toBeCloseTo(600);
    expect(result.resultingSize).toBeCloseTo(0.6);
    expect(result.resultingEntryPrice).toBe(50000);
    expect(result.resultingDirection).toBe('long');
    expect(result.newLiquidationPrice).toBe(48000);
  });

  it('releases margin proportionally for an opposite-side order that does not flip', () => {
    const result = getModifiedPositionPreview(
      baseInput({
        orderDirection: 'short',
        orderSize: 0.4,
        reduceOnly: false,
      }),
    );

    expect(result.kind).toBe('decrease');
    expect(result.newMargin).toBeCloseTo(600);
    expect(result.resultingSize).toBeCloseTo(0.6);
  });

  it('marks a reduce-only order that consumes the position as a full close', () => {
    const result = getModifiedPositionPreview(
      baseInput({
        orderDirection: 'short',
        orderSize: 1,
        reduceOnly: true,
      }),
    );

    expect(result.kind).toBe('full_close');
    expect(result.newMargin).toBe(0);
    expect(result.resultingSize).toBe(0);
    expect(result.resultingDirection).toBe('long');
    expect(result.newLiquidationPrice).toBe(0);
  });

  it('opens the leftover size in the order direction when flipping a long to short', () => {
    const result = getModifiedPositionPreview(
      baseInput({
        orderDirection: 'short',
        orderSize: 1.5,
        orderMargin: 30,
        orderPrice: 90000,
        reduceOnly: false,
      }),
    );

    expect(result.kind).toBe('flip');
    expect(result.resultingSize).toBeCloseTo(0.5);
    expect(result.newMargin).toBeCloseTo(10);
    expect(result.resultingEntryPrice).toBe(90000);
    expect(result.resultingDirection).toBe('short');
    expect(result.newLiquidationPrice).toBeCloseTo(89128.71, 1);
  });

  it('increases a short when the order is also short', () => {
    const result = getModifiedPositionPreview(
      baseInput({
        position: shortPosition,
        orderDirection: 'short',
      }),
    );

    expect(result.kind).toBe('increase');
    expect(result.resultingDirection).toBe('short');
    expect(result.currentLiquidationPrice).toBe(52000);
    expect(result.newMargin).toBe(1020);
    expect(result.newLiquidationPrice).toBeCloseTo(55528.35, 1);
  });
});
