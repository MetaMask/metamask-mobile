import { strings } from '../../../../../../locales/i18n';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import {
  getGraduationProgressViewModel,
  isGraduationProgressVisible,
} from './GraduationProgress.viewModel';

type LaunchpadDataOverrides = Partial<
  Omit<TokenAssetLaunchpadData, 'graduationPercent'>
> & {
  graduationPercent?: number | string | null;
};

const baseLaunchpadData = (
  overrides: LaunchpadDataOverrides,
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

describe('isGraduationProgressVisible', () => {
  it('returns false for null launchpadData', () => {
    expect(isGraduationProgressVisible(null)).toBe(false);
  });

  it('returns false for undefined launchpadData', () => {
    expect(isGraduationProgressVisible(undefined)).toBe(false);
  });

  it('returns false for a migrated token', () => {
    const launchpadData = baseLaunchpadData({ graduationStage: 'migrated' });
    expect(isGraduationProgressVisible(launchpadData)).toBe(false);
  });

  it('returns false for a completed token', () => {
    const launchpadData = baseLaunchpadData({ graduationStage: 'completed' });
    expect(isGraduationProgressVisible(launchpadData)).toBe(false);
  });

  it('returns false for an unknown stage', () => {
    const launchpadData = baseLaunchpadData({ graduationStage: 'unknown' });
    expect(isGraduationProgressVisible(launchpadData)).toBe(false);
  });

  it('returns true for a created token without a percent', () => {
    const launchpadData = baseLaunchpadData({ graduationStage: 'created' });
    expect(isGraduationProgressVisible(launchpadData)).toBe(true);
  });

  it('returns true for a bonding token below 100 percent', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: 99.9,
    });
    expect(isGraduationProgressVisible(launchpadData)).toBe(true);
  });

  it('parses a string percent from the API for a bonding token', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });
    expect(isGraduationProgressVisible(launchpadData)).toBe(true);
  });

  it('returns false for a bonding token at 100 percent', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: 100,
    });
    expect(isGraduationProgressVisible(launchpadData)).toBe(false);
  });

  it('returns false for a bonding token with a 100 percent string', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '100',
    });
    expect(isGraduationProgressVisible(launchpadData)).toBe(false);
  });

  it('returns false for a bonding token without a percent', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: null,
    });
    expect(isGraduationProgressVisible(launchpadData)).toBe(false);
  });

  it('returns false for a bonding token with an unparseable percent', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: 'not-a-number',
    });
    expect(isGraduationProgressVisible(launchpadData)).toBe(false);
  });
});

describe('getGraduationProgressViewModel', () => {
  it('derives the bonding view model from a string percent', () => {
    const launchpadData = baseLaunchpadData({
      protocol: 'pumpfun',
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel).toStrictEqual({
      stage: 'bonding',
      percent: 94,
      percentLabel: '94',
      isNearGraduation: true,
      isLastBand: true,
      moneyRowLeadingLabel: strings('token_details_v1.graduation.bonded', {
        percent: '94',
      }),
      moneyRowTrailingLabel: ` · ${strings(
        'token_details_v1.graduation.raised',
        {
          amount: '$64.9K',
        },
      )} · ${strings('token_details_v1.graduation.to_graduation', {
        amount: '$4.1K',
      })}`,
      accessibilityLabel: strings(
        'token_details_v1.graduation.accessibility_bonding',
        {
          percent: '94',
          raised: '$64.9K',
          remaining: '$4.1K',
        },
      ),
    });
  });

  it('derives the created view model', () => {
    const launchpadData = baseLaunchpadData({
      protocol: 'pumpfun',
      graduationStage: 'created',
      graduationPercent: '24',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.stage).toBe('created');
    expect(viewModel.percent).toBe(24);
    expect(viewModel.percentLabel).toBe('24');
    expect(viewModel.isNearGraduation).toBe(false);
    expect(viewModel.isLastBand).toBe(false);
    expect(viewModel.moneyRowLeadingLabel).toBe('24%');
    expect(viewModel.moneyRowTrailingLabel).toBe(
      ` ${strings('token_details_v1.graduation.remaining_phrase')}`,
    );
    expect(viewModel.accessibilityLabel).toBe(
      strings('token_details_v1.graduation.accessibility_created', {
        percent: '24',
        remaining: '$52.4K',
      }),
    );
  });

  it('treats a missing percent on a created token as zero', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'created',
      graduationPercent: null,
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.percent).toBe(0);
    expect(viewModel.moneyRowLeadingLabel).toBe('0%');
  });

  it('rounds the percent label', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94.37',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.percent).toBe(94.37);
    expect(viewModel.percentLabel).toBe('94');
  });

  it('clamps a negative percent to zero', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'created',
      graduationPercent: '-5',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.percent).toBe(0);
  });

  it('clamps an above-100 percent on a created token to 100', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'created',
      graduationPercent: '150',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.percent).toBe(100);
    expect(viewModel.percentLabel).toBe('100');
  });

  it('falls back to an unknown percent for an unparseable value', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'created',
      graduationPercent: 'n/a',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.percent).toBe(0);
  });

  it('uses the letsbonk graduation target', () => {
    const launchpadData = baseLaunchpadData({
      protocol: 'letsbonk',
      graduationStage: 'bonding',
      graduationPercent: '50',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.moneyRowTrailingLabel).toBe(
      ` · ${strings('token_details_v1.graduation.raised', {
        amount: '$15.0K',
      })} · ${strings('token_details_v1.graduation.to_graduation', {
        amount: '$15.0K',
      })}`,
    );
  });

  it('matches the protocol case-insensitively', () => {
    const launchpadData = baseLaunchpadData({
      protocol: 'PumpFun',
      graduationStage: 'bonding',
      graduationPercent: '50',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.moneyRowTrailingLabel).toBe(
      ` · ${strings('token_details_v1.graduation.raised', {
        amount: '$34.5K',
      })} · ${strings('token_details_v1.graduation.to_graduation', {
        amount: '$34.5K',
      })}`,
    );
  });

  it('falls back to the default target for an unknown protocol', () => {
    const launchpadData = baseLaunchpadData({
      protocol: 'unknownpad',
      graduationStage: 'bonding',
      graduationPercent: '50',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.moneyRowTrailingLabel).toBe(
      ` · ${strings('token_details_v1.graduation.raised', {
        amount: '$34.5K',
      })} · ${strings('token_details_v1.graduation.to_graduation', {
        amount: '$34.5K',
      })}`,
    );
  });

  it('falls back to the default target for a missing protocol', () => {
    const launchpadData = baseLaunchpadData({
      protocol: null,
      graduationStage: 'bonding',
      graduationPercent: '50',
    });

    const viewModel = getGraduationProgressViewModel(launchpadData);

    expect(viewModel.moneyRowTrailingLabel).toBe(
      ` · ${strings('token_details_v1.graduation.raised', {
        amount: '$34.5K',
      })} · ${strings('token_details_v1.graduation.to_graduation', {
        amount: '$34.5K',
      })}`,
    );
  });

  it('marks the near-graduation and last-band thresholds', () => {
    const earlyLaunchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '74',
    });
    const lateLaunchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '90',
    });

    const earlyViewModel = getGraduationProgressViewModel(earlyLaunchpadData);
    const lateViewModel = getGraduationProgressViewModel(lateLaunchpadData);

    expect(earlyViewModel.isNearGraduation).toBe(false);
    expect(earlyViewModel.isLastBand).toBe(false);
    expect(lateViewModel.isNearGraduation).toBe(true);
    expect(lateViewModel.isLastBand).toBe(true);
  });
});
