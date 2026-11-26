import { getBridgeTokenBadgeLabel } from './getBridgeTokenBadgeLabel';
import type { BridgeToken } from '../types';

const baseToken: BridgeToken = {
  address: '0x1',
  symbol: 'T',
  decimals: 18,
  chainId: '0x1',
};

const stockRwaData = { instrumentType: 'stock' } as BridgeToken['rwaData'];
const unspecifiedRwaData = {
  instrumentType: 'unspecified',
} as BridgeToken['rwaData'];

describe('getBridgeTokenBadgeLabel', () => {
  it('returns undefined when the RWA feature is off', () => {
    const token = {
      ...baseToken,
      rwaData: stockRwaData,
      badgeLabel: 'Stock',
    };

    expect(getBridgeTokenBadgeLabel(token, false)).toBeUndefined();
  });

  it('returns the API badgeLabel for tokens that are not stock-classified', () => {
    const token = {
      ...baseToken,
      rwaData: unspecifiedRwaData,
      badgeLabel: 'Stock',
    };

    expect(getBridgeTokenBadgeLabel(token, true)).toBe('Stock');
  });

  it('returns the API badgeLabel over the stock fallback', () => {
    const token = { ...baseToken, rwaData: stockRwaData, badgeLabel: 'ETF' };

    expect(getBridgeTokenBadgeLabel(token, true)).toBe('ETF');
  });

  it('falls back to Stock for stock RWA tokens without badgeLabel', () => {
    const token = { ...baseToken, rwaData: stockRwaData };

    expect(getBridgeTokenBadgeLabel(token, true)).toBe('Stock');
  });

  it('falls back to Stock when badgeLabel is blank', () => {
    const token = { ...baseToken, rwaData: stockRwaData, badgeLabel: '  ' };

    expect(getBridgeTokenBadgeLabel(token, true)).toBe('Stock');
  });

  it('returns undefined for tokens without badgeLabel that are not stocks', () => {
    const token = { ...baseToken, rwaData: unspecifiedRwaData };

    expect(getBridgeTokenBadgeLabel(token, true)).toBeUndefined();
  });
});
