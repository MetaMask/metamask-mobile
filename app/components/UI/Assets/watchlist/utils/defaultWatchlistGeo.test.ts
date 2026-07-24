import {
  getDefaultWatchlistAssetIds,
  isSpaceXDefaultEligible,
  SPACEX_DEFAULT_GEO_BLOCKED_COUNTRIES,
  SPACEX_DEFAULT_GEO_BLOCKED_REGIONS,
} from './defaultWatchlistGeo';
import {
  DEFAULT_WATCHLIST_BASE_ASSET_IDS,
  SPACEX_DEFAULT_ASSET_ID,
} from '../constants/defaultWatchlistTokens';

describe('defaultWatchlistGeo', () => {
  describe('isSpaceXDefaultEligible', () => {
    it('returns false when geolocation is missing or unknown', () => {
      expect(isSpaceXDefaultEligible(undefined)).toBe(false);
      expect(isSpaceXDefaultEligible('UNKNOWN')).toBe(false);
    });

    it('returns false for blocked countries', () => {
      for (const country of SPACEX_DEFAULT_GEO_BLOCKED_COUNTRIES) {
        expect(isSpaceXDefaultEligible(country)).toBe(false);
        expect(isSpaceXDefaultEligible(`${country}-XX`)).toBe(false);
      }
    });

    it('returns false for blocked sub-regions', () => {
      for (const region of SPACEX_DEFAULT_GEO_BLOCKED_REGIONS) {
        expect(isSpaceXDefaultEligible(region)).toBe(false);
      }
    });

    it('returns true for eligible countries', () => {
      expect(isSpaceXDefaultEligible('DE')).toBe(true);
      expect(isSpaceXDefaultEligible('GB')).toBe(true);
      expect(isSpaceXDefaultEligible('AR')).toBe(true);
      expect(isSpaceXDefaultEligible('de-be')).toBe(true);
    });
  });

  describe('getDefaultWatchlistAssetIds', () => {
    it('returns base 5 tokens when SpaceX is not eligible', () => {
      expect(getDefaultWatchlistAssetIds('US')).toStrictEqual(
        DEFAULT_WATCHLIST_BASE_ASSET_IDS,
      );
      expect(getDefaultWatchlistAssetIds(undefined)).toStrictEqual(
        DEFAULT_WATCHLIST_BASE_ASSET_IDS,
      );
    });

    it('returns base 5 plus SpaceX when eligible', () => {
      expect(getDefaultWatchlistAssetIds('DE')).toStrictEqual([
        ...DEFAULT_WATCHLIST_BASE_ASSET_IDS,
        SPACEX_DEFAULT_ASSET_ID,
      ]);
    });
  });
});
