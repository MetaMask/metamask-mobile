import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { GraduationProgress } from './GraduationProgress';
import {
  GraduationProgressSelectors,
  GRADUATION_TICK_POSITIONS,
} from './GraduationProgress.testIds';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { mockTheme } from '../../../../../util/theme';

const mockPlaySelection = jest.fn();
jest.mock('../../../../../util/haptics', () => ({
  useHaptics: () => ({ playSelection: mockPlaySelection }),
}));

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

const usdMarketData = (): FungibleAssetPrice => ({
  assetPriceType: 'fungible',
  lastUpdated: 1735689600000,
  price: 0.0000042,
  usdPrice: 0.0000042,
});

const renderGraduationProgress = ({
  graduationPercent,
  graduationStage,
}: {
  graduationPercent: number | string | null;
  graduationStage: string | null;
}) =>
  render(
    <GraduationProgress
      currentCurrency="usd"
      launchpad="pumpfun"
      launchpadData={buildLaunchpadData({
        graduationPercent,
        graduationStage,
      })}
      marketData={usdMarketData()}
    />,
  );

describe('GraduationProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bonding card with tag, percent, money copy, and ticks', () => {
    const { getByTestId, getByText, queryByTestId } = renderGraduationProgress({
      graduationPercent: '64',
      graduationStage: 'bonding',
    });

    expect(getByTestId(GraduationProgressSelectors.CARD)).toBeTruthy();
    expect(getByTestId(GraduationProgressSelectors.TAG)).toHaveTextContent(
      'BONDING',
    );
    expect(
      getByTestId(GraduationProgressSelectors.PERCENT).props.defaultValue,
    ).toStrictEqual('64%');
    expect(getByText('$44.2K raised · $24.8K to graduation')).toBeTruthy();
    GRADUATION_TICK_POSITIONS.forEach((position) => {
      expect(
        getByTestId(GraduationProgressSelectors.tick(position)),
      ).toBeTruthy();
    });
    expect(queryByTestId(GraduationProgressSelectors.AURA)).toBeNull();
  });

  it('exposes the bar as a progressbar with the exact percent value', () => {
    const { getByTestId } = renderGraduationProgress({
      graduationPercent: '64.4',
      graduationStage: 'bonding',
    });

    const bar = getByTestId(GraduationProgressSelectors.BAR);
    expect(bar.props.accessibilityRole).toStrictEqual('progressbar');
    expect(bar.props.accessibilityValue).toStrictEqual({
      max: 100,
      min: 0,
      now: 64.4,
    });
    expect(bar.props.accessibilityLabel).toStrictEqual(
      'Graduation progress. BONDING. $44.4K raised · $24.6K to graduation',
    );
  });

  it('exposes the stage label on the tag for screen readers', () => {
    const { getByTestId } = renderGraduationProgress({
      graduationPercent: '64',
      graduationStage: 'bonding',
    });

    expect(getByTestId(GraduationProgressSelectors.TAG).props).toEqual(
      expect.objectContaining({
        accessible: true,
        accessibilityLabel: 'BONDING',
      }),
    );
  });

  it('fills the bar with a solid theme-token view scaled by percent', () => {
    const { getByTestId } = renderGraduationProgress({
      graduationPercent: '64',
      graduationStage: 'bonding',
    });

    const fillStyle = StyleSheet.flatten(
      getByTestId(GraduationProgressSelectors.FILL).props.style,
    );
    expect(fillStyle.backgroundColor).toStrictEqual(
      mockTheme.colors.success.default,
    );
    expect(fillStyle.transformOrigin).toStrictEqual('left center');
    expect(fillStyle.transform).toStrictEqual([{ scaleX: 0 }]);
    expect(fillStyle.width).toStrictEqual(undefined);
  });

  it('uses the primary colour for a fresh token and warning near graduation', () => {
    const { getByTestId: freshQuery } = renderGraduationProgress({
      graduationPercent: '0',
      graduationStage: 'created',
    });
    const { getByTestId: nearQuery } = renderGraduationProgress({
      graduationPercent: '94',
      graduationStage: 'bonding',
    });

    const freshStyle = StyleSheet.flatten(
      freshQuery(GraduationProgressSelectors.FILL).props.style,
    );
    const nearStyle = StyleSheet.flatten(
      nearQuery(GraduationProgressSelectors.FILL).props.style,
    );
    expect(freshStyle.backgroundColor).toStrictEqual(
      mockTheme.colors.primary.default,
    );
    expect(nearStyle.backgroundColor).toStrictEqual(
      mockTheme.colors.warning.default,
    );
  });

  it('renders the new-token card with single-line percent copy', () => {
    const { getByTestId, getByText } = renderGraduationProgress({
      graduationPercent: '0',
      graduationStage: 'created',
    });

    expect(getByTestId(GraduationProgressSelectors.TAG)).toHaveTextContent(
      'NEW',
    );
    expect(getByText('0% to graduation')).toBeTruthy();
  });

  it('shows the near-graduation aura over the fill and fires one selection haptic', () => {
    const { getByTestId } = renderGraduationProgress({
      graduationPercent: '94',
      graduationStage: 'bonding',
    });

    const auraStyle = StyleSheet.flatten(
      getByTestId(GraduationProgressSelectors.AURA).props.style,
    );
    expect(auraStyle.backgroundColor).toStrictEqual(
      mockTheme.colors.success.default,
    );
    expect(auraStyle.transformOrigin).toStrictEqual('left center');
    expect(auraStyle.top).toStrictEqual(-3);
    expect(auraStyle.transform).toStrictEqual([{ scaleX: 0 }]);
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('omits the haptic below the near-graduation threshold', () => {
    renderGraduationProgress({
      graduationPercent: '64',
      graduationStage: 'bonding',
    });

    expect(mockPlaySelection).not.toHaveBeenCalled();
  });

  it('renders nothing once the token graduates or migrates', () => {
    const { queryByTestId: bondingQuery } = renderGraduationProgress({
      graduationPercent: '100',
      graduationStage: 'bonding',
    });
    const { queryByTestId: migratedQuery } = renderGraduationProgress({
      graduationPercent: '100',
      graduationStage: 'migrated',
    });

    expect(bondingQuery(GraduationProgressSelectors.CARD)).toBeNull();
    expect(migratedQuery(GraduationProgressSelectors.CARD)).toBeNull();
  });

  it('renders nothing without launchpad data', () => {
    const { queryByTestId } = render(
      <GraduationProgress
        currentCurrency="usd"
        launchpad="pumpfun"
        launchpadData={null}
        marketData={usdMarketData()}
      />,
    );

    expect(queryByTestId(GraduationProgressSelectors.CARD)).toBeNull();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
