import {
  DEFAULT_GRADUATION_TARGET_USD,
  GRADUATION_TARGET_USD_BY_LAUNCHPAD,
  getGraduationDisplayPercent,
  getGraduationProgressViewModel,
  isGraduationProgressVisible,
  parseGraduationPercent,
} from './graduationViewModel';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';

/**
 * The query types `graduationPercent` as a number, but the token API actually
 * serializes it as a string, so fixtures allow both shapes.
 */
type LaunchpadDataFixture = Partial<
  Omit<TokenAssetLaunchpadData, 'graduationPercent'>
> & {
  graduationPercent?: number | string | null;
};

const launchpadData = (
  overrides: LaunchpadDataFixture = {},
): TokenAssetLaunchpadData =>
  ({
    protocol: 'pumpfun',
    deployer: null,
    launchedAt: null,
    description: null,
    bondingCurve: null,
    graduationPercent: null,
    graduationStage: null,
    devHeldPercent: null,
    insiderHeldPercent: null,
    sniperHeldPercent: null,
    holdersCount: null,
    top10HeldPercent: null,
    ...overrides,
  }) as TokenAssetLaunchpadData;

describe('parseGraduationPercent', () => {
  it('accepts the number the API type promises', () => {
    expect(parseGraduationPercent(94.2)).toStrictEqual(94.2);
  });

  it('parses the string the API actually serializes', () => {
    expect(parseGraduationPercent('1.3893726258097416')).toStrictEqual(
      1.3893726258097416,
    );
  });

  it('returns null for null, undefined and non-numeric values', () => {
    expect(parseGraduationPercent(null)).toStrictEqual(null);
    expect(parseGraduationPercent(undefined)).toStrictEqual(null);
    expect(parseGraduationPercent('')).toStrictEqual(null);
    expect(parseGraduationPercent('not-a-number')).toStrictEqual(null);
  });

  it('clamps out-of-range values into 0–100', () => {
    expect(parseGraduationPercent(120)).toStrictEqual(100);
    expect(parseGraduationPercent(-5)).toStrictEqual(0);
  });
});

describe('isGraduationProgressVisible', () => {
  it('hides tokens without launchpad data', () => {
    expect(isGraduationProgressVisible(null)).toStrictEqual(false);
    expect(isGraduationProgressVisible(undefined)).toStrictEqual(false);
  });

  it('hides tokens whose percent is unusable', () => {
    expect(
      isGraduationProgressVisible(
        launchpadData({ graduationStage: 'bonding' }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        launchpadData({
          graduationStage: 'bonding',
          graduationPercent: 'nonsense',
        }),
      ),
    ).toStrictEqual(false);
  });

  it('shows created tokens', () => {
    expect(
      isGraduationProgressVisible(
        launchpadData({ graduationStage: 'created', graduationPercent: 0 }),
      ),
    ).toStrictEqual(true);
  });

  it('shows bonding tokens below one hundred percent', () => {
    expect(
      isGraduationProgressVisible(
        launchpadData({
          graduationStage: 'bonding',
          graduationPercent: '94.2',
        }),
      ),
    ).toStrictEqual(true);
  });

  it('hides bonding tokens at one hundred percent', () => {
    expect(
      isGraduationProgressVisible(
        launchpadData({
          graduationStage: 'bonding',
          graduationPercent: 100,
        }),
      ),
    ).toStrictEqual(false);
  });

  it('hides graduated, migrated and unknown stages', () => {
    for (const stage of ['completed', 'graduated', 'migrated', null, 'weird']) {
      expect(
        isGraduationProgressVisible(
          launchpadData({ graduationStage: stage, graduationPercent: 42 }),
        ),
      ).toStrictEqual(false);
    }
  });
});

describe('getGraduationProgressViewModel', () => {
  it('returns null whenever the visibility predicate hides the token', () => {
    expect(getGraduationProgressViewModel(null, 'pumpfun')).toStrictEqual(null);
    expect(
      getGraduationProgressViewModel(
        launchpadData({ graduationStage: 'migrated', graduationPercent: 100 }),
        'pumpfun',
      ),
    ).toStrictEqual(null);
  });

  it('derives the bonding view model from percent and launchpad target', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({
          graduationStage: 'bonding',
          graduationPercent: '94.2',
        }),
        'pumpfun',
      ),
    ).toStrictEqual({
      stage: 'bonding',
      percent: 94.2,
      raisedUsd: 64998.00000000001,
      remainingUsd: 4001.9999999999977,
    });
  });

  it('maps the created stage to the new stage', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({
          graduationStage: 'created',
          graduationPercent: 0,
        }),
        'pumpfun',
      ),
    ).toStrictEqual({
      stage: 'new',
      percent: 0,
      raisedUsd: 0,
      remainingUsd: DEFAULT_GRADUATION_TARGET_USD,
    });
  });

  it('uses each launchpad’s own graduation target', () => {
    const letsBonk = getGraduationProgressViewModel(
      launchpadData({
        protocol: 'letsbonk',
        graduationStage: 'bonding',
        graduationPercent: 50,
      }),
      'letsbonk',
    );
    expect(letsBonk?.remainingUsd).toStrictEqual(
      GRADUATION_TARGET_USD_BY_LAUNCHPAD.letsbonk / 2,
    );
  });

  it('falls back to the launchpad data protocol and then the default target', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({
          protocol: 'fourmeme',
          graduationStage: 'bonding',
          graduationPercent: 50,
        }),
        null,
      )?.raisedUsd,
    ).toStrictEqual(GRADUATION_TARGET_USD_BY_LAUNCHPAD.fourmeme / 2);

    expect(
      getGraduationProgressViewModel(
        launchpadData({
          protocol: 'unknownpad',
          graduationStage: 'bonding',
          graduationPercent: 50,
        }),
        null,
      )?.raisedUsd,
    ).toStrictEqual(DEFAULT_GRADUATION_TARGET_USD / 2);
  });
});

describe('getGraduationDisplayPercent', () => {
  it('rounds to an integer', () => {
    expect(getGraduationDisplayPercent(94.2)).toStrictEqual(94);
    expect(getGraduationDisplayPercent(24.6)).toStrictEqual(25);
  });

  it('never rounds a bonding token up to one hundred percent', () => {
    expect(getGraduationDisplayPercent(99.6)).toStrictEqual(99);
  });

  it('keeps a true one hundred percent', () => {
    expect(getGraduationDisplayPercent(100)).toStrictEqual(100);
  });
});
