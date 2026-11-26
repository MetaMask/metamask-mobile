import {
  PERPS_CONSTANTS,
  type PositionModifyPreviewResult,
} from '@metamask/perps-controller';
import {
  getCrossPreviewLiquidation,
  getPositionModifySummaryDisplay,
} from './positionModifyPreview';

const formatUsd = (value: number) => `$${value}`;

describe('getPositionModifySummaryDisplay', () => {
  it('returns showBeforeAfter false for none', () => {
    const result = getPositionModifySummaryDisplay({
      preview: { status: 'none' },
      formatMargin: formatUsd,
      formatLiquidation: formatUsd,
      hasValidAmount: true,
    });

    expect(result.showBeforeAfter).toBe(false);
    expect(result.tpslLiquidationPrice).toBeUndefined();
    expect(result.tpslDirection).toBeUndefined();
  });

  it('returns showBeforeAfter false for an unsupported provider', () => {
    const result = getPositionModifySummaryDisplay({
      preview: { status: 'unsupported', reason: 'provider' },
      formatMargin: formatUsd,
      formatLiquidation: formatUsd,
      hasValidAmount: true,
    });

    expect(result.showBeforeAfter).toBe(false);
  });

  it.each([
    ['covered_by_account' as const, 'N/A'],
    ['missing_inputs' as const, PERPS_CONSTANTS.FallbackDataDisplay],
  ])('shows a Cross result unavailable for %s as %s', (reason, expected) => {
    const result = getPositionModifySummaryDisplay({
      preview: {
        status: 'open',
        kind: 'increase',
        current: {
          margin: { available: true, value: 400 },
          liquidationPrice: { available: false },
        },
        resulting: {
          direction: 'long',
          size: 2,
          entryPrice: 2000,
          leverage: 10,
          margin: { available: true, value: 300 },
          liquidationPrice: { available: false, reason },
        },
      },
      formatMargin: formatUsd,
      formatLiquidation: formatUsd,
      hasValidAmount: true,
      isCurrentCoveredByAccount: true,
    });

    expect(result.currentLiquidationDisplay).toBe('N/A');
    expect(result.resultingLiquidationDisplay).toBe(expected);
    expect(result.tpslLiquidationPrice).toBeUndefined();
  });

  it('maps an open increase with independent margin and liquidation', () => {
    const preview: PositionModifyPreviewResult = {
      status: 'open',
      kind: 'increase',
      current: {
        margin: { available: true, value: 400 },
        liquidationPrice: { available: false },
      },
      resulting: {
        direction: 'long',
        size: 2,
        entryPrice: 2000,
        leverage: 10,
        margin: { available: true, value: 300 },
        liquidationPrice: { available: true, value: 1836 },
      },
    };

    const result = getPositionModifySummaryDisplay({
      preview,
      formatMargin: formatUsd,
      formatLiquidation: formatUsd,
      hasValidAmount: true,
    });

    expect(result.showBeforeAfter).toBe(true);
    expect(result.currentMarginDisplay).toBe('$400');
    expect(result.resultingMarginDisplay).toBe('$300');
    expect(result.currentLiquidationDisplay).toBe(
      PERPS_CONSTANTS.FallbackDataDisplay,
    );
    expect(result.resultingLiquidationDisplay).toBe('$1836');
    expect(result.tpslLiquidationPrice).toBe('1836');
    expect(result.tpslDirection).toBe('long');
  });

  it('uses resulting direction for a decrease so TP/SL stay on the open side', () => {
    const preview: PositionModifyPreviewResult = {
      status: 'open',
      kind: 'decrease',
      current: {
        margin: { available: true, value: 400 },
        liquidationPrice: { available: true, value: 1640 },
      },
      resulting: {
        direction: 'long',
        size: 0.5,
        entryPrice: 2000,
        leverage: 5,
        margin: { available: true, value: 200 },
        liquidationPrice: { available: true, value: 1640 },
      },
    };

    const result = getPositionModifySummaryDisplay({
      preview,
      formatMargin: formatUsd,
      formatLiquidation: formatUsd,
      hasValidAmount: true,
    });

    expect(result.tpslDirection).toBe('long');
    expect(result.tpslLiquidationPrice).toBe('1640');
  });

  it.each([
    ['decrease', 'long'],
    ['flip', 'short'],
  ] as const)(
    'keeps TP/SL direction and liquidation atomic for %s when liquidation is unavailable',
    (kind, direction) => {
      const preview: PositionModifyPreviewResult = {
        status: 'open',
        kind,
        current: {
          margin: { available: true, value: 400 },
          liquidationPrice: { available: true, value: 1640 },
        },
        resulting: {
          direction,
          size: 0.5,
          entryPrice: 2000,
          leverage: 5,
          margin: { available: true, value: 200 },
          liquidationPrice: { available: false },
        },
      };

      const result = getPositionModifySummaryDisplay({
        preview,
        formatMargin: formatUsd,
        formatLiquidation: formatUsd,
        hasValidAmount: true,
      });

      expect(result.tpslLiquidationPrice).toBeUndefined();
      expect(result.tpslDirection).toBeUndefined();
    },
  );

  it('maps a full close to zero margin and unavailable after-liquidation', () => {
    const preview: PositionModifyPreviewResult = {
      status: 'full_close',
      current: {
        margin: { available: true, value: 400 },
        liquidationPrice: { available: true, value: 1640 },
      },
      resultingDirection: 'long',
    };

    const result = getPositionModifySummaryDisplay({
      preview,
      formatMargin: formatUsd,
      formatLiquidation: formatUsd,
      hasValidAmount: true,
    });

    expect(result.showBeforeAfter).toBe(true);
    expect(result.resultingMarginDisplay).toBe('$0');
    expect(result.resultingLiquidationDisplay).toBe(
      PERPS_CONSTANTS.FallbackDataDisplay,
    );
    expect(result.tpslLiquidationPrice).toBeUndefined();
  });
});

describe('getCrossPreviewLiquidation', () => {
  const current = {
    margin: { available: true, value: 400 } as const,
    liquidationPrice: { available: false } as const,
  };
  const open = (
    liquidationPrice: Extract<
      PositionModifyPreviewResult,
      { status: 'open' }
    >['resulting']['liquidationPrice'],
  ): PositionModifyPreviewResult => ({
    status: 'open',
    kind: 'increase',
    current,
    resulting: {
      direction: 'long',
      size: 2,
      entryPrice: 2000,
      leverage: 10,
      margin: { available: true, value: 300 },
      liquidationPrice,
    },
  });

  it.each<[string, PositionModifyPreviewResult, object]>([
    [
      'a price',
      open({ available: true, value: 1836 }),
      { status: 'price', price: '1836' },
    ],
    [
      'a covered account',
      open({ available: false, reason: 'covered_by_account' }),
      { status: 'none' },
    ],
    [
      'missing inputs',
      open({ available: false, reason: 'missing_inputs' }),
      { status: 'unavailable' },
    ],
    [
      'a full close',
      { status: 'full_close', current, resultingDirection: 'long' },
      { status: 'none' },
    ],
    [
      'no preview',
      { status: 'unsupported', reason: 'provider' },
      { status: 'unavailable' },
    ],
  ])('maps %s', (_label, preview, expected) => {
    expect(getCrossPreviewLiquidation(preview)).toEqual(expected);
  });
});
