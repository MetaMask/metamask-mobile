import {
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  MARKET_ABOUT_EVENT_PROPERTY,
  MARKET_ABOUT_INTERACTION_TYPE,
  getMarketAboutDisplayedEventProperties,
  getMarketAboutMarketCategory,
} from './marketAbout';

const createMarket = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData =>
  ({
    symbol: 'BTC',
    name: 'Bitcoin',
    marketType: 'crypto',
    ...overrides,
  }) as PerpsMarketData;

describe('marketAbout', () => {
  describe('getMarketAboutMarketCategory', () => {
    it('returns the market category for a standard market', () => {
      expect(getMarketAboutMarketCategory(createMarket())).toBe('crypto');
    });

    it('buckets HIP-3 markets into hip3 regardless of market type', () => {
      expect(
        getMarketAboutMarketCategory(
          createMarket({ isHip3: true, marketType: 'stock' }),
        ),
      ).toBe('hip3');
    });

    it('defaults to crypto when the market type is missing', () => {
      expect(
        getMarketAboutMarketCategory(createMarket({ marketType: undefined })),
      ).toBe('crypto');
    });
  });

  describe('getMarketAboutDisplayedEventProperties', () => {
    it('builds properties using canonical PERPS_EVENT_PROPERTY keys', () => {
      const properties = getMarketAboutDisplayedEventProperties(
        createMarket(),
        'A short description.',
      );

      expect(properties).toEqual({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          MARKET_ABOUT_INTERACTION_TYPE.DISPLAYED,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
        [PERPS_EVENT_PROPERTY.MARKET_CATEGORY]: 'crypto',
        [MARKET_ABOUT_EVENT_PROPERTY.DESCRIPTION_LENGTH]: 'A short description.'
          .length,
      });
    });
  });
});
