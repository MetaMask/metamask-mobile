import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_MARKET_HIGHLIGHTS_FLAG,
} from '../constants/flags';
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
      marketHighlightsFlag: DEFAULT_MARKET_HIGHLIGHTS_FLAG,
      fakOrdersEnabled: false,
      predictWithAnyTokenEnabled: false,
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
});
