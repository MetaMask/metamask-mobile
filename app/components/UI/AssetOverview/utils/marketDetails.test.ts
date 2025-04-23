import { formatMarketDetails } from './marketDetails';

describe('formatMarketDetails', () => {
  const mockOptions = {
    locale: 'en-US',
    currentCurrency: 'USD',
    isEvmNetworkSelected: true,
    conversionRate: 1.5,
  };

  it('should format market details correctly with all values', () => {
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const result = formatMarketDetails(marketData, mockOptions);

    expect(result).toEqual({
      marketCap: '$1.50M',
      totalVolume: '$750.00K',
      volumeToMarketCap: '50.00%',
      circulatingSupply: '1.00M',
      allTimeHigh: '$150.00',
      allTimeLow: '$75.00',
      fullyDiluted: '$3.00M',
    });
  });

  it('should handle null values correctly', () => {
    const marketData = {
      marketCap: 0,
      totalVolume: undefined,
      circulatingSupply: undefined,
      allTimeHigh: 0,
      allTimeLow: undefined,
      dilutedMarketCap: undefined,
    };

    const result = formatMarketDetails(marketData, mockOptions);

    expect(result).toEqual({
      marketCap: null,
      totalVolume: null,
      volumeToMarketCap: null,
      circulatingSupply: null,
      allTimeHigh: null,
      allTimeLow: null,
      fullyDiluted: null,
    });
  });

  it('should handle non-EVM network correctly', () => {
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const nonEvmOptions = {
      ...mockOptions,
      isEvmNetworkSelected: false,
    };

    const result = formatMarketDetails(marketData, nonEvmOptions);

    expect(result).toEqual({
      marketCap: '$1.00M',
      totalVolume: '$500.00K',
      volumeToMarketCap: '50.00%',
      circulatingSupply: '1.00M',
      allTimeHigh: '$100.00',
      allTimeLow: '$50.00',
      fullyDiluted: '$2.00M',
    });
  });

  it('should handle different locales correctly', () => {
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const deOptions = {
      ...mockOptions,
      locale: 'de-DE',
      currentCurrency: 'EUR',
    };

    const result = formatMarketDetails(marketData, deOptions);

    expect(result).toEqual({
      marketCap: '1,50\xa0Mio.\xa0€',
      totalVolume: '750,00\xa0Tsd.\xa0€',
      volumeToMarketCap: '50,00\xa0%',
      circulatingSupply: '1,00\xa0Mio.',
      allTimeHigh: '150,00\xa0€',
      allTimeLow: '75,00\xa0€',
      fullyDiluted: '3,00\xa0Mio.\xa0€',
    });
  });
});
