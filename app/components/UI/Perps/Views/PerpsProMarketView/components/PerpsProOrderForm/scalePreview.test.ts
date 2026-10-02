import type {
  GetScalePriceLadderParams,
  PerpsScalePriceLadder,
} from '@metamask/perps-controller';
import { getLighterScaleReceipt, getVenueScalePreview } from './scalePreview';

const intent: GetScalePriceLadderParams = {
  symbol: 'ETH',
  providerId: 'lighter',
  minPrice: 2000,
  maxPrice: 2200,
  count: 3,
  sizing: { usdAmount: '2200', skew: 2.5 },
};
const preview: Extract<PerpsScalePriceLadder, { status: 'ready' }> & {
  sizingPreview: NonNullable<
    Extract<PerpsScalePriceLadder, { status: 'ready' }>['sizingPreview']
  >;
} = {
  status: 'ready',
  providerId: 'lighter',
  prices: ['2000', '2100', '2200'],
  sizingPreview: {
    sizes: ['0.2', '0.3', '0.5'],
    totalSize: '1',
    totalNotional: '2130',
    minimumBaseSize: '0.01',
    minimumQuoteAmount: '7',
    sizeDecimals: 2,
  },
};

describe('venue-owned Scale form contract', () => {
  it('keeps venue quantities and notional below the requested quote budget', () => {
    const result = getVenueScalePreview(intent, preview);

    expect(result).toEqual({
      success: true,
      rungs: [
        { index: 0, price: '2000', size: '0.2' },
        { index: 1, price: '2100', size: '0.3' },
        { index: 2, price: '2200', size: '0.5' },
      ],
      minPrice: '2000',
      maxPrice: '2200',
      orderCount: 3,
      skew: 2.5,
      orderValue: '2130',
      totalSize: '1',
      sizingIntent: intent.sizing,
    });
  });

  it('retains exact base intent instead of converting through quote cents', () => {
    const base = { ...intent, sizing: { size: '1', skew: 2.5 } };

    const result = getVenueScalePreview(base, preview);

    expect(result?.sizingIntent).toEqual({ size: '1', skew: 2.5 });
    expect(result?.totalSize).toBe('1');
  });

  it.each([
    ['wrong route', { ...preview, providerId: 'hyperliquid' as const }],
    [
      'absent sizing',
      {
        status: 'ready' as const,
        providerId: 'lighter' as const,
        prices: preview.prices,
      },
    ],
    ['missing rung', { ...preview, prices: ['2000', '2200'] }],
    [
      'inconsistent total',
      {
        ...preview,
        sizingPreview: { ...preview.sizingPreview, totalSize: '1.1' },
      },
    ],
    [
      'inconsistent notional',
      {
        ...preview,
        sizingPreview: { ...preview.sizingPreview, totalNotional: '2000' },
      },
    ],
    [
      'nonpositive rung',
      {
        ...preview,
        sizingPreview: {
          ...preview.sizingPreview,
          sizes: ['0', '0.5', '0.5'],
        },
      },
    ],
  ])('refuses %s evidence', (_reason, response) => {
    const result = getVenueScalePreview(intent, response);

    expect(result).toBeUndefined();
  });

  it('refuses a quote preview that exceeds the user budget', () => {
    const result = getVenueScalePreview(
      { ...intent, sizing: { usdAmount: '2129', skew: 2.5 } },
      preview,
    );

    expect(result).toBeUndefined();
  });

  it('refuses a base preview that silently changes exact exposure', () => {
    const result = getVenueScalePreview(
      { ...intent, sizing: { size: '1.001', skew: 2.5 } },
      preview,
    );

    expect(result).toBeUndefined();
  });

  it('reports known failed partial acceptance without requested-size fallback', () => {
    const result = getLighterScaleReceipt(
      {
        success: false,
        submittedSize: '1',
        acceptedSize: '0.2',
        acceptedChildren: [{ state: 'resting', orderId: 'venue-child-9' }],
      },
      3,
    );

    expect(result).toEqual({
      acceptedCount: 1,
      acceptedSize: '0.2',
      isUncertain: false,
      isRejected: false,
      isPartial: true,
      isComplete: false,
    });
  });

  it('keeps empty actual acceptance distinct from missing evidence', () => {
    const result = getLighterScaleReceipt(
      { success: false, acceptedSize: '0', acceptedChildren: [] },
      3,
    );

    expect(result.acceptedCount).toBe(0);
    expect(result.isUncertain).toBe(false);
    expect(result.isRejected).toBe(true);
    expect(result.isPartial).toBe(false);
  });

  it('keeps submitted exposure and resting IDs from proving acceptance', () => {
    const result = getLighterScaleReceipt(
      { success: true, submittedSize: '1', childOrderIds: ['venue-child-9'] },
      3,
    );

    expect(result.acceptedCount).toBeUndefined();
    expect(result.acceptedSize).toBeUndefined();
    expect(result.isUncertain).toBe(true);
    expect(result.isComplete).toBe(false);
  });

  it('counts waiting accepted children without inventing exchange IDs', () => {
    const result = getLighterScaleReceipt(
      {
        success: true,
        acceptedSize: '1',
        acceptedChildren: [
          { state: 'waitingForFill' },
          { state: 'filled', orderId: 'venue-child-10' },
          { state: 'resting', orderId: 'venue-child-11' },
        ],
      },
      3,
    );

    expect(result.acceptedCount).toBe(3);
    expect(result.isComplete).toBe(true);
  });
});
