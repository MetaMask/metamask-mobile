import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import { getGraduationProgressViewModel } from './getGraduationProgressViewModel';

const launchpadData = (
  overrides: Partial<TokenAssetLaunchpadData> = {},
): TokenAssetLaunchpadData => ({
  protocol: 'pumpfun',
  deployer: null,
  launchedAt: 1_700_000_000,
  description: null,
  bondingCurve: null,
  graduationPercent: 94,
  graduationStage: 'bonding',
  devHeldPercent: null,
  insiderHeldPercent: null,
  sniperHeldPercent: null,
  holdersCount: null,
  top10HeldPercent: null,
  ...overrides,
});

describe('getGraduationProgressViewModel', () => {
  it('returns null when there is no launchpad data', () => {
    expect(getGraduationProgressViewModel(null, 'pumpfun')).toStrictEqual(null);
    expect(getGraduationProgressViewModel(undefined, 'pumpfun')).toStrictEqual(
      null,
    );
  });

  it('returns null when graduation percent is null', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({ graduationPercent: null }),
        'pumpfun',
      ),
    ).toStrictEqual(null);
  });

  it('returns null when graduation percent is not a number', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({
          graduationPercent: 'not-a-number' as unknown as number,
        }),
        'pumpfun',
      ),
    ).toStrictEqual(null);
  });

  it.each(['migrated', 'established', 'graduated', null])(
    'returns null for the hidden stage %p',
    (stage) => {
      expect(
        getGraduationProgressViewModel(
          launchpadData({ graduationStage: stage }),
          'pumpfun',
        ),
      ).toStrictEqual(null);
    },
  );

  it('returns null for a bonding token at 100 percent', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({ graduationPercent: 100 }),
        'pumpfun',
      ),
    ).toStrictEqual(null);
  });

  it('returns null for a bonding token whose string percent parses above 100', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({ graduationPercent: '150' as unknown as number }),
        'pumpfun',
      ),
    ).toStrictEqual(null);
  });

  it('maps a bonding token to stage, clamped percent, and dollar labels', () => {
    expect(
      getGraduationProgressViewModel(launchpadData(), 'pumpfun'),
    ).toStrictEqual({
      stage: 'bonding',
      percent: 94,
      displayPercent: 94,
      raisedLabel: '$64.9K',
      remainingLabel: '$4.1K',
      isAlmostGraduated: true,
    });
  });

  it('accepts the string percent the API sends despite the declared type', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({ graduationPercent: '94' as unknown as number }),
        'pumpfun',
      ),
    ).toStrictEqual({
      stage: 'bonding',
      percent: 94,
      displayPercent: 94,
      raisedLabel: '$64.9K',
      remainingLabel: '$4.1K',
      isAlmostGraduated: true,
    });
  });

  it('keeps a mid-curve bonding token out of the almost-graduated band', () => {
    const viewModel = getGraduationProgressViewModel(
      launchpadData({ graduationPercent: 24 }),
      'pumpfun',
    );

    expect(viewModel?.isAlmostGraduated).toBe(false);
    expect(viewModel?.raisedLabel).toBe('$16.6K');
    expect(viewModel?.remainingLabel).toBe('$52.4K');
  });

  it('floors the display percent while keeping the exact fill percent', () => {
    const viewModel = getGraduationProgressViewModel(
      launchpadData({ graduationPercent: 94.7 }),
      'pumpfun',
    );

    expect(viewModel?.percent).toBe(94.7);
    expect(viewModel?.displayPercent).toBe(94);
  });

  it('clamps a negative percent to zero for a bonding token', () => {
    const viewModel = getGraduationProgressViewModel(
      launchpadData({ graduationPercent: -5 }),
      'pumpfun',
    );

    expect(viewModel?.percent).toBe(0);
    expect(viewModel?.displayPercent).toBe(0);
  });

  it('shows only the remaining amount for a created token', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({ graduationStage: 'created', graduationPercent: 24 }),
        'pumpfun',
      ),
    ).toStrictEqual({
      stage: 'created',
      percent: 24,
      displayPercent: 24,
      raisedLabel: null,
      remainingLabel: '$52.4K',
      isAlmostGraduated: false,
    });
  });

  it('maps the new stage onto the created view', () => {
    expect(
      getGraduationProgressViewModel(
        launchpadData({ graduationStage: 'new', graduationPercent: 24 }),
        'pumpfun',
      ),
    ).toStrictEqual(
      getGraduationProgressViewModel(
        launchpadData({ graduationStage: 'created', graduationPercent: 24 }),
        'pumpfun',
      ),
    );
  });

  it('keeps a created token visible at 100 percent, per the visibility rule', () => {
    const viewModel = getGraduationProgressViewModel(
      launchpadData({ graduationStage: 'created', graduationPercent: 100 }),
      'pumpfun',
    );

    expect(viewModel?.displayPercent).toBe(100);
  });

  it('derives the money labels from the launchpad-specific graduation target', () => {
    const bonk = getGraduationProgressViewModel(launchpadData(), 'bonkfun');
    expect(bonk?.remainingLabel).toBe('$1.8K');

    const fourmeme = getGraduationProgressViewModel(
      launchpadData({ graduationPercent: 50 }),
      'four.meme',
    );
    expect(fourmeme?.raisedLabel).toBe('$24.0K');
    expect(fourmeme?.remainingLabel).toBe('$24.0K');
  });

  it('falls back to the default target for an unknown launchpad', () => {
    const viewModel = getGraduationProgressViewModel(
      launchpadData(),
      'unknown-launchpad',
    );

    expect(viewModel?.raisedLabel).toBe('$64.9K');
  });

  it('falls back to the default target when the launchpad is null', () => {
    const viewModel = getGraduationProgressViewModel(launchpadData(), null);

    expect(viewModel?.raisedLabel).toBe('$64.9K');
  });
});
