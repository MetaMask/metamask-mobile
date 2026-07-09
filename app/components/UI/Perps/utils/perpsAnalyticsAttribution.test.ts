import {
  hasPerpsUtmAttribution,
  parsePerpsUtmFromPath,
  setPerpsUtmAttribution,
  toPerpsEntryAttribution,
} from './perpsAnalyticsAttribution';

const mockSetAttributionContext = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PerpsController: {
        setAttributionContext: (...args: unknown[]) =>
          mockSetAttributionContext(...args),
      },
    },
  },
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
});
