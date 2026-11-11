import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { GraduationProgress } from './GraduationProgress';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import { TokenDetailsIds } from '../../testIds';
import type { TokenI } from '../../../Tokens/types';

jest.mock('react-native-linear-gradient', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return ({ children }: { children?: React.ReactNode }) => (
    <RNView>{children}</RNView>
  );
});

jest.mock('../../../Assets/components/AssetLogo/AssetLogo', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return () => <RNView testID="mock-asset-logo" />;
});

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

const TOKEN: TokenI = {
  address: '0x456',
  aggregators: [],
  decimals: 18,
  image: 'https://example.com/logo.png',
  name: 'Launch Token',
  symbol: 'LCH',
  balance: '0',
  logo: undefined,
  isETH: false,
  chainId: '0x1',
};

const HERO_CONTENT = 'HERO CONTENT';

const renderWithHero = (launchpadData: TokenAssetLaunchpadData | null) =>
  render(
    <GraduationProgress launchpadData={launchpadData} token={TOKEN}>
      <Text>{HERO_CONTENT}</Text>
    </GraduationProgress>,
  );

describe('GraduationProgress', () => {
  it('renders the rail and money row for a bonding token', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const { getByTestId, getByText } = renderWithHero(launchpadData);

    expect(getByTestId(TokenDetailsIds.graduation.rail)).toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.graduation.fill)).toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.graduation.rider)).toBeOnTheScreen();
    expect(
      getByTestId(TokenDetailsIds.graduation.percentPill),
    ).toBeOnTheScreen();
    expect(getByTestId(TokenDetailsIds.graduation.dexCap)).toBeOnTheScreen();
    expect(getByText(HERO_CONTENT)).toBeOnTheScreen();
  });

  it('exposes the bonding progress to assistive technology', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const { getByTestId } = renderWithHero(launchpadData);

    const rail = getByTestId(TokenDetailsIds.graduation.rail);
    expect(rail.props.accessible).toBe(true);
    expect(rail.props.accessibilityRole).toBe('progressbar');
    expect(rail.props.accessibilityValue).toStrictEqual({
      min: 0,
      max: 100,
      now: 94,
    });
    expect(rail.props.accessibilityLabel).toBe(
      strings('token_details_v1.graduation.accessibility_bonding', {
        percent: '94',
        raised: '$64.9K',
        remaining: '$4.1K',
      }),
    );
  });

  it('renders the bonding money row copy', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const { getByTestId } = renderWithHero(launchpadData);

    const moneyRow = getByTestId(TokenDetailsIds.graduation.moneyRow);
    expect(moneyRow).toHaveTextContent(
      `${strings('token_details_v1.graduation.bonded', {
        percent: '94',
      })} · ${strings('token_details_v1.graduation.raised', {
        amount: '$64.9K',
      })} · ${strings('token_details_v1.graduation.to_graduation', {
        amount: '$4.1K',
      })}`,
    );
  });

  it('renders the created money row copy', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'created',
      graduationPercent: '24',
    });

    const { getByTestId } = renderWithHero(launchpadData);

    const moneyRow = getByTestId(TokenDetailsIds.graduation.moneyRow);
    expect(moneyRow).toHaveTextContent(
      `24% ${strings('token_details_v1.graduation.remaining_phrase')}`,
    );
  });

  it('shows the final percent in the pill from its default value', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const { getByTestId } = renderWithHero(launchpadData);

    expect(
      getByTestId(TokenDetailsIds.graduation.percentText),
    ).toHaveDisplayValue('94%');
  });

  it('renders the DEX cap label', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const { getByText } = renderWithHero(launchpadData);

    expect(
      getByText(strings('token_details_v1.graduation.dex_label')),
    ).toBeOnTheScreen();
  });

  it('renders the milestone labels', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const { getByText } = renderWithHero(launchpadData);

    expect(getByText('25')).toBeOnTheScreen();
    expect(getByText('50')).toBeOnTheScreen();
    expect(getByText('75')).toBeOnTheScreen();
  });

  it('renders the token avatar on the rider', () => {
    const launchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '94',
    });

    const { getByTestId } = renderWithHero(launchpadData);

    expect(getByTestId('mock-asset-logo')).toBeOnTheScreen();
  });

  it('renders only the hero when launchpadData is null', () => {
    const { queryByTestId, getByText } = renderWithHero(null);

    expect(queryByTestId(TokenDetailsIds.graduation.rail)).toBeNull();
    expect(queryByTestId(TokenDetailsIds.graduation.moneyRow)).toBeNull();
    expect(getByText(HERO_CONTENT)).toBeOnTheScreen();
  });

  it('renders only the hero when launchpadData is undefined', () => {
    const { queryByTestId, getByText } = render(
      <GraduationProgress launchpadData={undefined} token={TOKEN}>
        <Text>{HERO_CONTENT}</Text>
      </GraduationProgress>,
    );

    expect(queryByTestId(TokenDetailsIds.graduation.rail)).toBeNull();
    expect(getByText(HERO_CONTENT)).toBeOnTheScreen();
  });

  it('renders only the hero for a migrated token', () => {
    const { queryByTestId, getByText } = renderWithHero(
      baseLaunchpadData({ graduationStage: 'migrated' }),
    );

    expect(queryByTestId(TokenDetailsIds.graduation.rail)).toBeNull();
    expect(queryByTestId(TokenDetailsIds.graduation.moneyRow)).toBeNull();
    expect(getByText(HERO_CONTENT)).toBeOnTheScreen();
  });

  it('renders only the hero for a completed token', () => {
    const { queryByTestId, getByText } = renderWithHero(
      baseLaunchpadData({ graduationStage: 'completed' }),
    );

    expect(queryByTestId(TokenDetailsIds.graduation.rail)).toBeNull();
    expect(getByText(HERO_CONTENT)).toBeOnTheScreen();
  });

  it('renders only the hero for a bonding token at 100 percent', () => {
    const { queryByTestId, getByText } = renderWithHero(
      baseLaunchpadData({
        graduationStage: 'bonding',
        graduationPercent: '100',
      }),
    );

    expect(queryByTestId(TokenDetailsIds.graduation.rail)).toBeNull();
    expect(getByText(HERO_CONTENT)).toBeOnTheScreen();
  });

  it('hides the spark dots outside the last band', () => {
    const earlyLaunchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '74',
    });
    const lateLaunchpadData = baseLaunchpadData({
      graduationStage: 'bonding',
      graduationPercent: '90',
    });

    const early = renderWithHero(earlyLaunchpadData);
    expect(
      early.queryAllByTestId(TokenDetailsIds.graduation.spark),
    ).toHaveLength(0);

    const late = renderWithHero(lateLaunchpadData);
    expect(
      late.queryAllByTestId(TokenDetailsIds.graduation.spark),
    ).toHaveLength(4);

    early.unmount();
    late.unmount();
  });
});
