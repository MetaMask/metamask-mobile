import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  formatExchangeFeeRate,
  PERPS_EXCHANGE_STAT_MISSING,
  summarizeExchangeMarkets,
} from './defaultExchangeStats';

const market = (
  providerId: PerpsMarketData['providerId'],
  maxLeverage: string,
  openInterest?: number,
  volume?: number,
): PerpsMarketData =>
  ({
    providerId,
    maxLeverage,
    numericValues: { openInterest, volume },
  }) as PerpsMarketData;

describe('formatExchangeFeeRate', () => {
  it('formats a provider fee decimal as a percent', () => {
    expect(formatExchangeFeeRate(0.00145)).toBe('0.145%');
  });

  it('uses the missing marker when the provider omits a rate', () => {
    expect(formatExchangeFeeRate(undefined)).toBe(PERPS_EXCHANGE_STAT_MISSING);
  });
});

describe('summarizeExchangeMarkets', () => {
  const markets = [
    market('hyperliquid', '40x', 10, 4),
    market('hyperliquid', '50x', 2, 1),
    market('lighter', '20x', 7, 3),
  ];

  it('counts only the requested venue and keeps its highest leverage', () => {
    const summary = summarizeExchangeMarkets(
      markets,
      PROVIDER_CONFIG.DefaultProvider,
    );

    expect(summary.marketCount).toBe(2);
    expect(summary.maxLeverage).toBe('50x');
    expect(summary.openInterest).not.toBe(PERPS_EXCHANGE_STAT_MISSING);
    expect(summary.volume24h).not.toBe(PERPS_EXCHANGE_STAT_MISSING);
  });

  it('reports missing stats when a venue published no rows', () => {
    const summary = summarizeExchangeMarkets(
      [],
      PROVIDER_CONFIG.LighterProvider,
    );

    expect(summary).toEqual({
      marketCount: 0,
      maxLeverage: PERPS_EXCHANGE_STAT_MISSING,
      openInterest: PERPS_EXCHANGE_STAT_MISSING,
      volume24h: PERPS_EXCHANGE_STAT_MISSING,
    });
  });
});
