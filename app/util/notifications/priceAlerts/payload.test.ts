import {
  assetLink,
  displayWithFallback,
  formatPriceAlert,
  parsePriceAlert,
  swapLink,
} from './payload';

const threshold = {
  mm_delivery: 'price_alert',
  mm_ui: 'price_alert@1',
  kind: 'threshold',
  symbol: 'ETH',
  asset_id: 'eip155:1/slip44:60',
  price: '4036.42',
  change_pct: '3.1',
  target: '4000',
  direction: 'above',
  points: '3990,4036.42',
};

const movement = {
  ...threshold,
  kind: 'movement',
  period: '24h',
  price: '3820.8',
  change_pct: '-5.2',
  points: '4025,3820.8',
};

describe('parsePriceAlert', () => {
  it('parses an above-target alert and derives the view and swap links', () => {
    const priceAlert = parsePriceAlert(threshold);

    expect(priceAlert).toMatchObject({
      target: 4000,
      description: 'Crossed above $4,000.00',
      points: [3990, 4036.42],
    });
    if (!priceAlert) {
      throw new Error('Expected a price alert');
    }
    expect(formatPriceAlert(priceAlert)).toEqual({
      title: 'ETH  ·  $4,036.42',
      change: '+3.1%',
    });
    expect(assetLink(priceAlert)).toBe(
      'https://link.metamask.io/asset?assetId=eip155%3A1%2Fslip44%3A60&source=price_alert_notification&alert_type=threshold&price_at_trigger=4036.42',
    );
    expect(swapLink(priceAlert)).toBe(
      'https://link.metamask.io/swap?from=eip155%3A1%2Fslip44%3A60',
    );
  });

  it('parses a downward movement without a target line', () => {
    const priceAlert = parsePriceAlert(movement);

    expect(priceAlert).toMatchObject({
      kind: 'movement',
      description: 'Price movement · 24h',
      compactContext: '24h',
      change: -5.2,
    });
    expect(priceAlert?.target).toBeUndefined();
  });

  it.each([
    ['missing marker', { mm_delivery: undefined }],
    ['unknown version', { mm_ui: 'price_alert@2' }],
    ['unsupported kind', { kind: 'other' }],
    ['markup', { symbol: '<b>ETH</b>' }],
    ['invalid asset', { asset_id: 'https://example.org' }],
    ['invalid direction', { direction: 'sideways' }],
    ['invalid period', { kind: 'movement', period: '1y' }],
    ['non-finite price', { price: 'Infinity' }],
    ['excessive change', { change_pct: '1000001' }],
    ['non-positive price', { price: '0' }],
    ['empty chart item', { points: '3990,,4036.42' }],
    ['too many chart points', { points: Array(25).fill('4000').join(',') }],
  ])('rejects %s', (_label, patch) => {
    expect(parsePriceAlert({ ...threshold, ...patch })).toBeNull();
  });
});

describe('displayWithFallback', () => {
  const render = jest.fn();
  const fallback = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('only renders the rich alert on success', async () => {
    await displayWithFallback(threshold, render, fallback);

    expect(render).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  it.each([{ mm_ui: 'price_alert@2' }, { points: '' }])(
    'only renders plain copy for %p',
    async (patch) => {
      await displayWithFallback({ ...threshold, ...patch }, render, fallback);

      expect(render).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalledTimes(1);
    },
  );

  it('renders plain copy after a render failure', async () => {
    render.mockRejectedValueOnce(new Error('Could not render chart'));

    await displayWithFallback(threshold, render, fallback);

    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
