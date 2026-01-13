import { formatMarketDetails } from './marketDetails';

describe('formatMarketDetails', () => {
  const mockOptions = {
    locale: 'en-US',
    currentCurrency: 'USD',
  };

  const mockOptionsWithConversion = {
    locale: 'en-US',
    currentCurrency: 'USD',
    needsConversion: true,
    conversionRate: 3000,
  };

  it('formats market details without conversion (API-fetched data)', () => {
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
      marketCap: '$1.00M',
      totalVolume: '$500.00K',
      volumeToMarketCap: '50.00%',
      circulatingSupply: '1.00M',
      allTimeHigh: '$100.00',
      allTimeLow: '$50.00',
      fullyDiluted: '$2.00M',
    });
  });

  it('formats market details with conversion (cached EVM data)', () => {
    const marketData = {
      marketCap: 120000000, // 120M in ETH units
      totalVolume: 6000000, // 6M in ETH units
      circulatingSupply: 1000000,
      allTimeHigh: 1500, // in ETH units
      allTimeLow: 500, // in ETH units
      dilutedMarketCap: 120000000,
    };

    const result = formatMarketDetails(marketData, mockOptionsWithConversion);

    // 120M * 3000 = $360B
    expect(result).toEqual({
      marketCap: '$360.00B',
      totalVolume: '$18.00B',
      volumeToMarketCap: '5.00%',
      circulatingSupply: '1.00M',
      allTimeHigh: '$4,500,000.00',
      allTimeLow: '$1,500,000.00',
      fullyDiluted: '$360.00B',
    });
  });

  it('returns null for zero or undefined values', () => {
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

  it('formats market details with French locale and EUR currency', () => {
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const frenchLocaleOptions = {
      locale: 'fr-FR',
      currentCurrency: 'EUR',
    };

    const result = formatMarketDetails(marketData, frenchLocaleOptions);

    expect(result).toEqual({
      marketCap: '1,00\xa0M\xa0€',
      totalVolume: '500,00\xa0k\xa0€',
      volumeToMarketCap: '50,00\xa0%',
      circulatingSupply: '1,00\xa0M',
      allTimeHigh: '100,00\xa0€',
      allTimeLow: '50,00\xa0€',
      fullyDiluted: '2,00\xa0M\xa0€',
    });
  });

  it('does not convert when needsConversion is false even with conversionRate provided', () => {
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const options = {
      locale: 'en-US',
      currentCurrency: 'USD',
      needsConversion: false,
      conversionRate: 3000,
    };

    const result = formatMarketDetails(marketData, options);

    // No conversion applied
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
});
