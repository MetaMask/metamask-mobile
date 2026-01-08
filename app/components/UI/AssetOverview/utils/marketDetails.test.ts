import { formatMarketDetails } from './marketDetails';

describe('formatMarketDetails', () => {
  const mockOptionsForNativeAsset = {
    locale: 'en-US',
    currentCurrency: 'USD',
    isNativeAsset: true,
    conversionRate: 1.5,
  };

  const mockOptionsForERC20Token = {
    locale: 'en-US',
    currentCurrency: 'USD',
    isNativeAsset: false,
    conversionRate: 1.5,
  };

  it('formats market details with conversion for native assets', () => {
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const result = formatMarketDetails(marketData, mockOptionsForNativeAsset);

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

  it('returns null for zero or undefined values', () => {
    const marketData = {
      marketCap: 0,
      totalVolume: undefined,
      circulatingSupply: undefined,
      allTimeHigh: 0,
      allTimeLow: undefined,
      dilutedMarketCap: undefined,
    };

    const result = formatMarketDetails(marketData, mockOptionsForNativeAsset);

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

  it('formats market details without conversion for ERC20 tokens', () => {
    const marketData = {
      marketCap: 1000000,
      totalVolume: 500000,
      circulatingSupply: 1000000,
      allTimeHigh: 100,
      allTimeLow: 50,
      dilutedMarketCap: 2000000,
    };

    const result = formatMarketDetails(marketData, mockOptionsForERC20Token);

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
      ...mockOptionsForNativeAsset,
      locale: 'fr-FR',
      currentCurrency: 'EUR',
    };

    const result = formatMarketDetails(marketData, frenchLocaleOptions);

    expect(result).toEqual({
      marketCap: '1,50\xa0M\xa0€',
      totalVolume: '750,00\xa0k\xa0€',
      volumeToMarketCap: '50,00\xa0%',
      circulatingSupply: '1,00\xa0M',
      allTimeHigh: '150,00\xa0€',
      allTimeLow: '75,00\xa0€',
      fullyDiluted: '3,00\xa0M\xa0€',
    });
  });
});
