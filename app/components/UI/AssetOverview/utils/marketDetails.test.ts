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

  it('should format market details correctly for French locale', () => {
    // Test data with realistic market values
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const frenchLocaleOptions = {
      ...mockOptions,
      locale: 'fr-FR',
      currentCurrency: 'EUR',
    };

    const formattedMarketDetails = formatMarketDetails(
      marketData,
      frenchLocaleOptions,
    );

    // Expected French-formatted values with currency
    const expectedFormattedValues = {
      marketCap: '1,50\xa0M\xa0€', // 1.5M EUR
      totalVolume: '750,00\xa0k\xa0€', // 750K EUR
      volumeToMarketCap: '50,00\xa0%', // 50% volume to market cap ratio
      circulatingSupply: '1,00\xa0M', // 1M tokens
      allTimeHigh: '150,00\xa0€', // 150 EUR
      allTimeLow: '75,00\xa0€', // 75 EUR
      fullyDiluted: '3,00\xa0M\xa0€', // 3M EUR
    };

    expect(formattedMarketDetails).toEqual(expectedFormattedValues);
  });
});
