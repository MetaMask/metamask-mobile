import type { FungibleAssetPrice } from '@metamask/assets-controller';

import {
  formatGraduationPercentLabel,
  getGraduationProgressViewModel,
  isGraduationProgressVisible,
  parseGraduationPercent,
} from './GraduationProgress.viewmodel';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';

const buildLaunchpadData = ({
  graduationPercent = null,
  graduationStage = null,
}: {
  graduationPercent?: number | string | null;
  graduationStage?: string | null;
} = {}): TokenAssetLaunchpadData =>
  ({
    bondingCurve: null,
    deployer: '0xabc',
    description: null,
    devHeldPercent: null,
    graduationPercent,
    graduationStage,
    holdersCount: 1200,
    insiderHeldPercent: null,
    launchedAt: 1735689600000,
    protocol: 'pump.fun',
    sniperHeldPercent: null,
    top10HeldPercent: null,
  }) as TokenAssetLaunchpadData;

const usdMarketData = (
  price = 0.0000042,
  usdPrice = 0.0000042,
): FungibleAssetPrice => ({
  assetPriceType: 'fungible',
  lastUpdated: 1735689600000,
  price,
  usdPrice,
});

describe('parseGraduationPercent', () => {
  it('parses numeric and string percent sources', () => {
    expect(parseGraduationPercent(94)).toStrictEqual(94);
    expect(parseGraduationPercent('94')).toStrictEqual(94);
    expect(parseGraduationPercent('1.3893726258097416')).toStrictEqual(
      1.3893726258097416,
    );
  });

  it('clamps values outside the 0 to 100 range', () => {
    expect(parseGraduationPercent(150)).toStrictEqual(100);
    expect(parseGraduationPercent('150')).toStrictEqual(100);
    expect(parseGraduationPercent(-5)).toStrictEqual(0);
  });

  it('returns null for missing or unparseable sources', () => {
    expect(parseGraduationPercent(null)).toStrictEqual(null);
    expect(parseGraduationPercent(undefined)).toStrictEqual(null);
    expect(parseGraduationPercent('')).toStrictEqual(null);
    expect(parseGraduationPercent('abc')).toStrictEqual(null);
  });
});

describe('formatGraduationPercentLabel', () => {
  it('formats integer percentages without decimals', () => {
    expect(formatGraduationPercentLabel(0)).toStrictEqual('0%');
    expect(formatGraduationPercentLabel(24)).toStrictEqual('24%');
    expect(formatGraduationPercentLabel(94)).toStrictEqual('94%');
    expect(formatGraduationPercentLabel(100)).toStrictEqual('100%');
  });

  it('formats fractional percentages with one decimal', () => {
    expect(formatGraduationPercentLabel(1.3893726258097416)).toStrictEqual(
      '1.4%',
    );
    expect(formatGraduationPercentLabel(94.2)).toStrictEqual('94.2%');
    expect(formatGraduationPercentLabel(99.7)).toStrictEqual('99.7%');
  });
});

describe('isGraduationProgressVisible', () => {
  it('shows created tokens and bonding tokens below one hundred percent', () => {
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: '0',
          graduationStage: 'created',
        }),
      ),
    ).toStrictEqual(true);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: '0.39',
          graduationStage: 'new',
        }),
      ),
    ).toStrictEqual(true);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 94,
          graduationStage: 'bonding',
        }),
      ),
    ).toStrictEqual(true);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: '99.9',
          graduationStage: 'bonding',
        }),
      ),
    ).toStrictEqual(true);
  });

  it('hides tokens without launchpad data or a usable percent', () => {
    expect(isGraduationProgressVisible(null)).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: null,
          graduationStage: 'bonding',
        }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 'n/a',
          graduationStage: 'created',
        }),
      ),
    ).toStrictEqual(false);
  });

  it('hides tokens that graduated or migrated on-chain', () => {
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 100,
          graduationStage: 'bonding',
        }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: '100',
          graduationStage: 'bonding',
        }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 100,
          graduationStage: 'migrated',
        }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 100,
          graduationStage: 'established',
        }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 100,
          graduationStage: 'migrating',
        }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 100,
          graduationStage: 'completed',
        }),
      ),
    ).toStrictEqual(false);
    expect(
      isGraduationProgressVisible(
        buildLaunchpadData({
          graduationPercent: 50,
          graduationStage: 'unknown',
        }),
      ),
    ).toStrictEqual(false);
  });
});

describe('getGraduationProgressViewModel', () => {
  it('derives the bonding view model from pump.fun figures', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '94',
        graduationStage: 'bonding',
      }),
      marketData: usdMarketData(),
    });

    expect(viewModel).toStrictEqual({
      accessibilityLabel:
        'Graduation progress. BONDING. $64.9K raised · $4.1K to graduation',
      detailLabel: '$64.9K raised · $4.1K to graduation',
      isNearGraduation: true,
      percent: 94,
      percentLabel: '94%',
      stage: 'bonding',
      stageLabel: 'BONDING',
    });
  });

  it('keeps one decimal for fractional bonding progress', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '1.3893726258097416',
        graduationStage: 'bonding',
      }),
      marketData: usdMarketData(),
    });

    expect(viewModel?.percent).toStrictEqual(1.3893726258097416);
    expect(viewModel?.percentLabel).toStrictEqual('1.4%');
    expect(viewModel?.detailLabel).toStrictEqual(
      '$958.67 raised · $68.0K to graduation',
    );
  });

  it('converts raised figures into the selected currency', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'eur',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: 94,
        graduationStage: 'bonding',
      }),
      marketData: usdMarketData(0.00000378, 0.0000042),
    });

    expect(viewModel?.detailLabel).toStrictEqual(
      '€58.4K raised · €3.7K to graduation',
    );
  });

  it('uses the launchpad-specific graduation target', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'fourmeme',
      launchpadData: buildLaunchpadData({
        graduationPercent: 94,
        graduationStage: 'bonding',
      }),
      marketData: null,
    });

    expect(viewModel?.detailLabel).toStrictEqual(
      '$45.1K raised · $2.9K to graduation',
    );
  });

  it('falls back to percent-only copy when the exchange rate is unknown', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'eur',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: 94,
        graduationStage: 'bonding',
      }),
      marketData: null,
    });

    expect(viewModel?.detailLabel).toStrictEqual('94% to graduation');
  });

  it('derives the new-token view model with percent-only copy', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '0',
        graduationStage: 'created',
      }),
      marketData: usdMarketData(),
    });

    expect(viewModel).toStrictEqual({
      accessibilityLabel: 'Graduation progress. NEW. 0% to graduation',
      detailLabel: '0% to graduation',
      isNearGraduation: false,
      percent: 0,
      percentLabel: '0%',
      stage: 'created',
      stageLabel: 'NEW',
    });
  });

  it('maps the new stage string to the same fresh-token card', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '0.39',
        graduationStage: 'new',
      }),
      marketData: null,
    });

    expect(viewModel?.stage).toStrictEqual('created');
    expect(viewModel?.stageLabel).toStrictEqual('NEW');
    expect(viewModel?.detailLabel).toStrictEqual('0.4% to graduation');
  });

  it('keeps new-token copy single-line even when a rate is known', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '24',
        graduationStage: 'created',
      }),
      marketData: usdMarketData(),
    });

    expect(viewModel?.detailLabel).toStrictEqual('24% to graduation');
  });

  it('marks bonding progress near graduation at ninety percent or above', () => {
    const below = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '89.9',
        graduationStage: 'bonding',
      }),
      marketData: null,
    });
    const at = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '90',
        graduationStage: 'bonding',
      }),
      marketData: null,
    });

    expect(below?.isNearGraduation).toStrictEqual(false);
    expect(at?.isNearGraduation).toStrictEqual(true);
  });

  it('clamps an oversized percent before building the model', () => {
    const viewModel = getGraduationProgressViewModel({
      currentCurrency: 'usd',
      launchpad: 'pumpfun',
      launchpadData: buildLaunchpadData({
        graduationPercent: '150',
        graduationStage: 'created',
      }),
      marketData: null,
    });

    expect(viewModel?.percent).toStrictEqual(100);
    expect(viewModel?.percentLabel).toStrictEqual('100%');
    expect(viewModel?.isNearGraduation).toStrictEqual(true);
  });

  it('returns null for tokens the module must hide', () => {
    expect(
      getGraduationProgressViewModel({
        currentCurrency: 'usd',
        launchpad: 'pumpfun',
        launchpadData: null,
        marketData: usdMarketData(),
      }),
    ).toStrictEqual(null);
    expect(
      getGraduationProgressViewModel({
        currentCurrency: 'usd',
        launchpad: 'pumpfun',
        launchpadData: buildLaunchpadData({
          graduationPercent: 100,
          graduationStage: 'migrated',
        }),
        marketData: usdMarketData(),
      }),
    ).toStrictEqual(null);
    expect(
      getGraduationProgressViewModel({
        currentCurrency: 'usd',
        launchpad: 'pumpfun',
        launchpadData: buildLaunchpadData({
          graduationPercent: '100',
          graduationStage: 'bonding',
        }),
        marketData: usdMarketData(),
      }),
    ).toStrictEqual(null);
  });
});
