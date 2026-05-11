import { getWhatsHappeningEventProps } from './eventProperties';
import { WhatsHappeningSource } from './constants';
import type { WhatsHappeningItem } from './types';

const baseItem: WhatsHappeningItem = {
  id: 'trend-1',
  title: 'Test trend',
  description: 'Test description',
  date: '2026-01-01',
  relatedAssets: [
    { symbol: 'BTC', name: 'Bitcoin', sourceAssetId: 'bitcoin' },
    { symbol: 'ETH', name: 'Ethereum', sourceAssetId: 'ethereum' },
  ],
  articles: [],
};

describe('getWhatsHappeningEventProps', () => {
  it('returns required base properties', () => {
    const result = getWhatsHappeningEventProps(
      baseItem,
      0,
      WhatsHappeningSource.Homepage,
    );

    expect(result).toMatchObject({
      trend_id: 'trend-1',
      card_index: 0,
      asset_symbols: ['BTC', 'ETH'],
      source: 'homepage',
    });
  });

  it('includes trend_category when item has a category', () => {
    const item = { ...baseItem, category: 'macro' as const };
    const result = getWhatsHappeningEventProps(
      item,
      2,
      WhatsHappeningSource.Homepage,
    );

    expect(result.trend_category).toBe('macro');
  });

  it('omits trend_category when item has no category', () => {
    const result = getWhatsHappeningEventProps(
      baseItem,
      0,
      WhatsHappeningSource.Homepage,
    );

    expect(result).not.toHaveProperty('trend_category');
  });

  it('includes trend_impact when item has an impact', () => {
    const item = { ...baseItem, impact: 'positive' as const };
    const result = getWhatsHappeningEventProps(
      item,
      1,
      WhatsHappeningSource.Homepage,
    );

    expect(result.trend_impact).toBe('positive');
  });

  it('omits trend_impact when item has no impact', () => {
    const result = getWhatsHappeningEventProps(
      baseItem,
      0,
      WhatsHappeningSource.Homepage,
    );

    expect(result).not.toHaveProperty('trend_impact');
  });

  it('maps relatedAssets to asset_symbols array', () => {
    const item = {
      ...baseItem,
      relatedAssets: [
        { symbol: 'SOL', name: 'Solana', sourceAssetId: 'solana' },
      ],
    };
    const result = getWhatsHappeningEventProps(
      item,
      3,
      WhatsHappeningSource.Detail,
    );

    expect(result.asset_symbols).toEqual(['SOL']);
  });

  it('returns an empty asset_symbols array when relatedAssets is empty', () => {
    const item = { ...baseItem, relatedAssets: [] };
    const result = getWhatsHappeningEventProps(
      item,
      0,
      WhatsHappeningSource.Detail,
    );

    expect(result.asset_symbols).toEqual([]);
  });

  it('sets source to homepage for homepage calls', () => {
    const result = getWhatsHappeningEventProps(
      baseItem,
      0,
      WhatsHappeningSource.Homepage,
    );

    expect(result.source).toBe('homepage');
  });

  it('sets source to detail for detail view calls', () => {
    const result = getWhatsHappeningEventProps(
      baseItem,
      0,
      WhatsHappeningSource.Detail,
    );

    expect(result.source).toBe('detail');
  });
});
