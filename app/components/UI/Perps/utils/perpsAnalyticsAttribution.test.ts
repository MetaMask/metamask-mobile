import {
  getTradingModeAnalyticsProperties,
  getPerpsUtmAttributionProperties,
  hasPerpsUtmAttribution,
  parsePerpsUtmFromPath,
  TRADING_MODE_ANALYTICS_PROPERTY,
  setPerpsUtmAttribution,
  toPerpsEntryAttribution,
} from './perpsAnalyticsAttribution';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { DEFAULT_PERPS_MODE, PerpsMode } from '@metamask/perps-controller';

const mockSetAttributionContext = jest.fn();
const mockMergeAttributionContext = jest.fn();
const mockSelectPerpsMode = jest.fn((_state?: unknown) => PerpsMode.Pro);
const mockGetState = jest.fn(() => ({}));

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

jest.mock('../../../../store', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsMode: (state: unknown) => mockSelectPerpsMode(state),
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

  describe('getTradingModeAnalyticsProperties', () => {
    it('returns the current Lite/Pro mode from the selector', () => {
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Pro);
      expect(getTradingModeAnalyticsProperties()).toEqual({
        [TRADING_MODE_ANALYTICS_PROPERTY]: PerpsMode.Pro,
      });
      expect(mockSelectPerpsMode).toHaveBeenCalledWith(mockGetState());
    });

    it('falls back to DEFAULT_PERPS_MODE and logs when lookup fails', () => {
      mockSelectPerpsMode.mockImplementation(() => {
        throw new Error('store unavailable');
      });
      expect(getTradingModeAnalyticsProperties()).toEqual({
        [TRADING_MODE_ANALYTICS_PROPERTY]: DEFAULT_PERPS_MODE,
      });
      expect(DevLogger.log).toHaveBeenCalled();
    });
  });
});
