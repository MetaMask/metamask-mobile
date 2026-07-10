import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import {
  DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG,
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_MARKET_HIGHLIGHTS_FLAG,
  DEFAULT_PREDICT_WORLD_CUP_FLAG,
  DEFAULT_WIMBLEDON_TAB_FLAG,
} from '../constants/flags';
import { DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES } from '../constants/sports';
import { resolvePredictFeatureFlags } from './resolvePredictFeatureFlags';

jest.mock('../../../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

const mockValidatedVersionGatedFeatureFlag = jest.mocked(
  validatedVersionGatedFeatureFlag,
);

describe('resolvePredictFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatedVersionGatedFeatureFlag.mockReturnValue(undefined);
  });

  it('returns defaults when feature flags are missing', () => {
    const result = resolvePredictFeatureFlags({});

    expect(result).toEqual({
      feeCollection: DEFAULT_FEE_COLLECTION_FLAG,
      liveSportsLeagues: [],
      extendedSportsMarketsLeagues: [],
      enabledSportsMarketTypes: [],
      nonRegTimeSportsMarketTypes: DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES,
      marketHighlightsFlag: DEFAULT_MARKET_HIGHLIGHTS_FLAG,
      fakOrdersEnabled: false,
      predictWithAnyTokenEnabled: false,
      predictUpDownEnabled: false,
      predictPortfolioEnabled: false,
      predictHomeRedesignEnabled: false,
      predictSportCardLivePricesEnabled: true,
      predictWorldCup: DEFAULT_PREDICT_WORLD_CUP_FLAG,
      predictWimbledonTab: DEFAULT_WIMBLEDON_TAB_FLAG,
    });
  });

  it('filters live sports leagues to supported values when enabled', () => {
    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictLiveSports: {
          enabled: true,
          leagues: ['nba', 'nfl', 'epl', 'ucl'],
        },
      },
    });

    expect(result.liveSportsLeagues).toEqual(['nba', 'nfl', 'epl', 'ucl']);
  });

  it('returns no live sports leagues when live sports flag is disabled', () => {
    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictLiveSports: {
          enabled: false,
          leagues: ['nba', 'nfl', 'ucl'],
        },
      },
    });

    expect(result.liveSportsLeagues).toEqual([]);
  });

  it('uses local overrides instead of remote flags when both are provided', () => {
    mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) =>
      Boolean(
        flag &&
          typeof flag === 'object' &&
          'enabled' in flag &&
          (flag as { enabled: boolean }).enabled,
      ),
    );

    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictFakOrders: { enabled: true, minimumVersion: '1.0.0' },
      },
      localOverrides: {
        predictFakOrders: { enabled: false, minimumVersion: '1.0.0' },
      },
    });

    expect(result.fakOrdersEnabled).toBe(false);
  });

  it('uses market highlights flag when version-gated validation returns true', () => {
    mockValidatedVersionGatedFeatureFlag.mockImplementationOnce(() => true);

    const marketHighlights = {
      enabled: true,
      minimumVersion: '1.0.0',
      highlights: [{ category: 'sports', markets: ['1', '2'] }],
    };

    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictMarketHighlights: marketHighlights,
      },
    });

    expect(result.marketHighlightsFlag).toEqual(marketHighlights);
  });

  it('passes through series ids on market highlights entries unchanged', () => {
    mockValidatedVersionGatedFeatureFlag.mockImplementationOnce(() => true);

    const marketHighlights = {
      enabled: true,
      minimumVersion: '1.0.0',
      highlights: [
        {
          category: 'crypto',
          markets: ['direct-1'],
          series: ['series-1', 'series-2'],
        },
        { category: 'sports', series: ['series-3'] },
      ],
    };

    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictMarketHighlights: marketHighlights,
      },
    });

    expect(result.marketHighlightsFlag).toEqual(marketHighlights);
  });

  it('falls back to default market highlights flag when validation returns false', () => {
    mockValidatedVersionGatedFeatureFlag.mockImplementationOnce(() => false);

    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictMarketHighlights: {
          enabled: true,
          minimumVersion: '1.0.0',
          highlights: [{ category: 'sports', markets: ['1'] }],
        },
      },
    });

    expect(result.marketHighlightsFlag).toEqual(DEFAULT_MARKET_HIGHLIGHTS_FLAG);
  });

  it('parses feeCollection from wrapped progressive rollout shape', () => {
    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictFeeCollection: {
          name: 'group-a',
          value: {
            enabled: false,
            collector: '0x100c7b833bbd604a77890783439bbb9d65e31de7',
            metamaskFee: 0.03,
            providerFee: 0.04,
            waiveList: ['0xabc'],
            executors: ['0xdef'],
            permit2Enabled: true,
          },
        },
      },
    });

    expect(result.feeCollection).toEqual({
      enabled: false,
      collector: '0x100c7b833bbd604a77890783439bbb9d65e31de7',
      metamaskFee: 0.03,
      providerFee: 0.04,
      waiveList: ['0xabc'],
      executors: ['0xdef'],
      permit2Enabled: true,
    });
  });

  it('falls back to default feeCollection when schema parsing fails', () => {
    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictFeeCollection: {
          enabled: true,
          collector: 'not-a-hex-address',
          metamaskFee: 0.01,
          providerFee: 0.02,
          waiveList: [],
          executors: [],
          permit2Enabled: false,
        },
      },
    });

    expect(result.feeCollection).toEqual(DEFAULT_FEE_COLLECTION_FLAG);
  });

  it('resolves version-gated booleans for fak orders and pay with any token', () => {
    mockValidatedVersionGatedFeatureFlag
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => false);

    const result = resolvePredictFeatureFlags({
      remoteFeatureFlags: {
        predictFakOrders: {
          name: 'group-a',
          value: { enabled: true, minimumVersion: '1.0.0' },
        },
        predictWithAnyToken: {
          name: 'group-b',
          value: { enabled: true, minimumVersion: '1.0.0' },
        },
      },
    });

    expect(result.fakOrdersEnabled).toBe(true);
    expect(result.predictWithAnyTokenEnabled).toBe(false);
  });

  describe('predictSportCardLivePricesEnabled', () => {
    it('defaults to true so sport cards fetch live prices by default', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.predictSportCardLivePricesEnabled).toBe(true);
    });

    it('returns false when the remote flag is disabled and version gate passes', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'enabled' in flag &&
          'minimumVersion' in flag
        ) {
          return (flag as { enabled: boolean }).enabled;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictSportCardLivePrices: {
            enabled: false,
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictSportCardLivePricesEnabled).toBe(false);
    });
  });

  describe('predictWorldCup', () => {
    it('returns default disabled config when flag is missing', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.predictWorldCup).toEqual(DEFAULT_PREDICT_WORLD_CUP_FLAG);
    });

    it('falls back to default disabled config when version gate fails', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'tagSlug' in flag) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictWorldCup: {
            enabled: true,
            minimumVersion: '99.0.0',
            showMainFeedBanner: true,
            showMainFeedTab: true,
            showWorldCupScreen: true,
            stages: [{ key: 'final', eventIds: ['1'] }],
          },
        },
      });

      expect(result.predictWorldCup).toEqual(DEFAULT_PREDICT_WORLD_CUP_FLAG);
    });

    it('parses config with defaults when version gate passes', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'tagSlug' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictWorldCup: {
            enabled: true,
            minimumVersion: '1.0.0',
            showMainFeedBanner: true,
            showMainFeedTab: true,
            showWorldCupScreen: true,
            bannerImage: {
              url: 'https://example.com/banner.png',
              width: 400,
              height: 200,
            },
            stages: [
              {
                key: 'group_stage',
                labelKey: 'predict.world_cup.stages.group_stage',
                eventIds: ['100', '101'],
              },
            ],
          },
        },
      });

      expect(result.predictWorldCup).toEqual({
        ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
        enabled: true,
        minimumVersion: '1.0.0',
        showMainFeedBanner: true,
        showMainFeedTab: true,
        showWorldCupScreen: true,
        bannerImage: {
          url: 'https://example.com/banner.png',
          width: 400,
          height: 200,
        },
        stages: [
          {
            key: 'group_stage',
            labelKey: 'predict.world_cup.stages.group_stage',
            eventIds: ['100', '101'],
          },
        ],
      });
    });

    it('falls back to default when schema parsing fails', () => {
      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictWorldCup: {
            enabled: true,
            minimumVersion: '1.0.0',
            showMainFeedBanner: 'yes',
          },
        },
      });

      expect(result.predictWorldCup).toEqual(DEFAULT_PREDICT_WORLD_CUP_FLAG);
    });
  });

  describe('predictWimbledonTab', () => {
    it('returns default disabled flag when flag is missing', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.predictWimbledonTab).toEqual(DEFAULT_WIMBLEDON_TAB_FLAG);
    });

    it('uses default query params when enabled flag omits query params', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) =>
        Boolean(
          flag &&
            typeof flag === 'object' &&
            'enabled' in flag &&
            (flag as { enabled: boolean }).enabled,
        ),
      );

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictWimbledon: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictWimbledonTab).toEqual({
        ...DEFAULT_WIMBLEDON_TAB_FLAG,
        enabled: true,
        minimumVersion: '1.0.0',
      });
    });

    it('uses remote query params when provided', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) =>
        Boolean(
          flag &&
            typeof flag === 'object' &&
            'enabled' in flag &&
            (flag as { enabled: boolean }).enabled,
        ),
      );

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictWimbledon: {
            enabled: true,
            minimumVersion: '1.0.0',
            queryParams: 'tag_slug=wimbledon&order=volume24hr',
          },
        },
      });

      expect(result.predictWimbledonTab).toEqual({
        enabled: true,
        minimumVersion: '1.0.0',
        queryParams: 'tag_slug=wimbledon&order=volume24hr',
      });
    });

    it('falls back to default when schema parsing fails', () => {
      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictWimbledon: {
            enabled: true,
            minimumVersion: '1.0.0',
            queryParams: 12345,
          },
        },
      });

      expect(result.predictWimbledonTab).toEqual(DEFAULT_WIMBLEDON_TAB_FLAG);
    });
  });

  describe('predictPortfolioEnabled', () => {
    it('returns false when flag is missing', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.predictPortfolioEnabled).toBe(false);
    });

    it('returns true when enabled and version gate passes', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictPortfolio: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictPortfolioEnabled).toBe(true);
    });

    it('returns false when flag is disabled', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictPortfolio: {
            enabled: false,
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictPortfolioEnabled).toBe(false);
    });

    it('returns false when flag is malformed', () => {
      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictPortfolio: {
            enabled: 'true',
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictPortfolioEnabled).toBe(false);
    });

    it('returns false when version gate fails', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictPortfolio: {
            enabled: true,
            minimumVersion: '99.0.0',
          },
        },
      });

      expect(result.predictPortfolioEnabled).toBe(false);
    });

    it('unwraps progressive rollout shape', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictPortfolio: {
            name: 'group-a',
            value: {
              enabled: true,
              minimumVersion: '1.0.0',
            },
          },
        },
      });

      expect(result.predictPortfolioEnabled).toBe(true);
    });
  });

  describe('predictHomeRedesignEnabled', () => {
    it('returns false when flag is missing', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.predictHomeRedesignEnabled).toBe(false);
    });

    it('returns true when enabled and version gate passes', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictHomeRedesign: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictHomeRedesignEnabled).toBe(true);
    });

    it('returns false when flag is disabled', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictHomeRedesign: {
            enabled: false,
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictHomeRedesignEnabled).toBe(false);
    });

    it('returns false when flag is malformed', () => {
      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictHomeRedesign: {
            enabled: 'true',
            minimumVersion: '1.0.0',
          },
        },
      });

      expect(result.predictHomeRedesignEnabled).toBe(false);
    });

    it('returns false when version gate fails', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictHomeRedesign: {
            enabled: true,
            minimumVersion: '99.0.0',
          },
        },
      });

      expect(result.predictHomeRedesignEnabled).toBe(false);
    });

    it('unwraps progressive rollout shape', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (
          flag &&
          typeof flag === 'object' &&
          'minimumVersion' in flag &&
          !('leagues' in flag) &&
          !('tagSlug' in flag)
        ) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictHomeRedesign: {
            name: 'group-a',
            value: {
              enabled: true,
              minimumVersion: '1.0.0',
            },
          },
        },
      });

      expect(result.predictHomeRedesignEnabled).toBe(true);
    });
  });

  describe('extendedSportsMarketsLeagues', () => {
    it('returns empty array when flag is missing', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.extendedSportsMarketsLeagues).toEqual([]);
    });

    it('returns empty array when flag is disabled', () => {
      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            ...DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG,
            enabled: false,
            leagues: ['nba', 'ucl'],
          },
        },
      });

      expect(result.extendedSportsMarketsLeagues).toEqual([]);
    });

    it('returns empty array when version check fails', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '99.0.0',
            leagues: ['nba', 'ucl'],
          },
        },
      });

      expect(result.extendedSportsMarketsLeagues).toEqual([]);
    });

    it('returns filtered leagues when enabled and version check passes', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['nba', 'ucl', 'fake_league'],
          },
        },
      });

      expect(result.extendedSportsMarketsLeagues).toEqual(['nba', 'ucl']);
    });

    it('unwraps progressive rollout shape', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            name: 'group-a',
            value: {
              enabled: true,
              minimumVersion: '1.0.0',
              leagues: ['nba', 'epl'],
            },
          },
        },
      });

      expect(result.extendedSportsMarketsLeagues).toEqual(['nba', 'epl']);
    });

    it('applies local override over remote flag', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) =>
        Boolean(
          flag &&
            typeof flag === 'object' &&
            'enabled' in flag &&
            'leagues' in flag &&
            (flag as { enabled: boolean }).enabled,
        ),
      );

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['nba', 'ucl'],
          },
        },
        localOverrides: {
          predictExtendedSportsMarkets: {
            enabled: false,
            minimumVersion: '1.0.0',
            leagues: ['nba', 'ucl'],
          },
        },
      });

      expect(result.extendedSportsMarketsLeagues).toEqual([]);
    });
  });

  describe('enabledSportsMarketTypes', () => {
    it('returns empty array when flag is missing', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.enabledSportsMarketTypes).toEqual([]);
    });

    it('returns supported market types when enabledSportsMarketTypes is missing', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['nba'],
          },
        },
      });

      expect(result.enabledSportsMarketTypes).toEqual([
        'moneyline',
        'spreads',
        'totals',
        'both_teams_to_score',
        'both_teams_to_score_first_half',
        'both_teams_to_score_second_half',
        'first_half_totals',
        'second_half_totals',
        'soccer_first_to_score',
        'soccer_halftime_result',
        'soccer_second_half_result',
        'soccer_player_goals',
        'soccer_team_to_advance',
        'soccer_extra_time',
        'soccer_penalty_shootout',
        'team_totals',
        'soccer_team_totals',
        'basketball_team_to_score_first',
        'soccer_exact_score',
      ]);
    });

    it('keeps the new full-tie-outcome market types when enabled', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['fifwc'],
            enabledSportsMarketTypes: [
              'moneyline',
              'soccer_extra_time',
              'soccer_penalty_shootout',
            ],
          },
        },
      });

      expect(result.enabledSportsMarketTypes).toEqual([
        'moneyline',
        'soccer_extra_time',
        'soccer_penalty_shootout',
      ]);
    });

    it('returns empty array when enabledSportsMarketTypes is explicit empty array', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['nba'],
            enabledSportsMarketTypes: [],
          },
        },
      });

      expect(result.enabledSportsMarketTypes).toEqual([]);
    });

    it('returns empty array when flag is disabled', () => {
      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            ...DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG,
            enabled: false,
            leagues: ['nba'],
            enabledSportsMarketTypes: ['moneyline', 'spreads', 'totals'],
          },
        },
      });

      expect(result.enabledSportsMarketTypes).toEqual([]);
    });

    it('returns empty array when version check fails', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '99.0.0',
            leagues: ['nba'],
            enabledSportsMarketTypes: ['moneyline', 'spreads', 'totals'],
          },
        },
      });

      expect(result.enabledSportsMarketTypes).toEqual([]);
    });

    it('returns filtered market types when enabled and version check passes', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['nba'],
            enabledSportsMarketTypes: [
              'moneyline',
              'MONEYLINE',
              'spreads',
              'totals',
              'soccer_halftime_result',
              'soccer_player_goals',
              'points',
            ],
          },
        },
      });

      expect(result.enabledSportsMarketTypes).toEqual([
        'moneyline',
        'spreads',
        'totals',
        'soccer_halftime_result',
        'soccer_player_goals',
      ]);
    });

    it('applies local override over remote flag', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) =>
        Boolean(
          flag &&
            typeof flag === 'object' &&
            'enabled' in flag &&
            'leagues' in flag &&
            (flag as { enabled: boolean }).enabled,
        ),
      );

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['nba'],
            enabledSportsMarketTypes: ['moneyline', 'spreads'],
          },
        },
        localOverrides: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['nba'],
            enabledSportsMarketTypes: ['totals'],
          },
        },
      });

      expect(result.enabledSportsMarketTypes).toEqual(['totals']);
    });
  });

  describe('nonRegTimeSportsMarketTypes', () => {
    it('returns the default full-tie market type when flag is missing', () => {
      const result = resolvePredictFeatureFlags({});

      expect(result.nonRegTimeSportsMarketTypes).toEqual(
        DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES,
      );
    });

    it('uses the default full-tie market type when the optional remote field is missing', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['ucl'],
            enabledSportsMarketTypes: ['moneyline'],
          },
        },
      });

      expect(result.nonRegTimeSportsMarketTypes).toEqual(
        DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES,
      );
    });

    it('replaces the default list when the optional remote field is present', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return true;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '1.0.0',
            leagues: ['ucl'],
            nonRegTimeSportsMarketTypes: [
              'moneyline',
              'MONEYLINE',
              'unsupported_market',
            ],
          },
        },
      });

      expect(result.nonRegTimeSportsMarketTypes).toEqual(['moneyline']);
    });

    it('falls back to the default list when the flag fails the version gate', () => {
      mockValidatedVersionGatedFeatureFlag.mockImplementation((flag) => {
        if (flag && typeof flag === 'object' && 'leagues' in flag) {
          return false;
        }
        return undefined;
      });

      const result = resolvePredictFeatureFlags({
        remoteFeatureFlags: {
          predictExtendedSportsMarkets: {
            enabled: true,
            minimumVersion: '99.0.0',
            leagues: ['ucl'],
            nonRegTimeSportsMarketTypes: ['moneyline'],
          },
        },
      });

      expect(result.nonRegTimeSportsMarketTypes).toEqual(
        DEFAULT_NON_REG_TIME_SPORTS_MARKET_TYPES,
      );
    });
  });
});
