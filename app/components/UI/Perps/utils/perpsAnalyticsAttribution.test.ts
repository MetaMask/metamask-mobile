import {
  getPerpsUtmAttributionProperties,
  hasPerpsUtmAttribution,
  parsePerpsUtmFromPath,
  setPerpsUtmAttribution,
  toPerpsEntryAttribution,
} from './perpsAnalyticsAttribution';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

const mockSetAttributionContext = jest.fn();
const mockMergeAttributionContext = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        setAttributionContext: (...args: unknown[]) =>
          mockSetAttributionContext(...args),
        mergeAttributionContext: (...args: unknown[]) =>
          mockMergeAttributionContext(...args),
      },
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

describe('perpsAnalyticsAttribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toPerpsEntryAttribution', () => {
    it('maps source to entryPoint', () => {
      expect(toPerpsEntryAttribution({ source: 'deeplink' })).toEqual({
        entryPoint: 'deeplink',
      });
    });

    it('maps sourceSection to discovery fields', () => {
      expect(
        toPerpsEntryAttribution({
          source: 'perps_home',
          sourceSection: 'watchlist',
        }),
      ).toEqual({
        entryPoint: 'perps_home',
        discoverySource: 'watchlist',
        perpDiscoverySource: 'watchlist',
      });
    });

    it('returns empty object when no input', () => {
      expect(toPerpsEntryAttribution({})).toEqual({});
    });
  });

  describe('parsePerpsUtmFromPath', () => {
    it('parses utm params from query string', () => {
      expect(
        parsePerpsUtmFromPath(
          'perps?screen=home&utm_source=twitter&utm_medium=social&utm_campaign=launch',
        ),
      ).toEqual({
        utmSource: 'twitter',
        utmMedium: 'social',
        utmCampaign: 'launch',
      });
    });

    it('returns empty object when no utm params', () => {
      expect(parsePerpsUtmFromPath('perps?screen=home')).toEqual({});
    });
  });

  describe('hasPerpsUtmAttribution', () => {
    it('returns true when any utm field is set', () => {
      expect(hasPerpsUtmAttribution({ utmSource: 'x' })).toBe(true);
    });

    it('returns false when empty', () => {
      expect(hasPerpsUtmAttribution({})).toBe(false);
    });
  });

  describe('setPerpsUtmAttribution', () => {
    it('calls controller setAttributionContext when utm present', () => {
      setPerpsUtmAttribution({ utmSource: 'twitter' });
      expect(mockSetAttributionContext).toHaveBeenCalledWith({
        utmSource: 'twitter',
      });
    });

    it('skips controller call when no utm fields', () => {
      setPerpsUtmAttribution({});
      expect(mockSetAttributionContext).not.toHaveBeenCalled();
    });
  });

  describe('getPerpsUtmAttributionProperties', () => {
    it('returns the controller merged attribution props', () => {
      mockMergeAttributionContext.mockReturnValue({ utm_source: 'twitter' });
      expect(getPerpsUtmAttributionProperties()).toEqual({
        utm_source: 'twitter',
      });
    });

    it('returns {} and logs instead of throwing when the lookup fails', () => {
      mockMergeAttributionContext.mockImplementation(() => {
        throw new Error('controller unavailable');
      });
      // Best-effort: the caller (every PERPS_SCREEN_VIEWED build) must still get
      // a usable object so the screen-view emit is never taken down.
      expect(() => getPerpsUtmAttributionProperties()).not.toThrow();
      expect(getPerpsUtmAttributionProperties()).toEqual({});
      expect(DevLogger.log).toHaveBeenCalled();
    });
  });
});
