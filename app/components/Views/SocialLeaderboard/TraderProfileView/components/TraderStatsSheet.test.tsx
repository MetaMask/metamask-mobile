import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { TraderProfileWithSheetStats } from '../types/traderProfileStatsSheet';
import TraderStatsSheet from './TraderStatsSheet';
import { TraderStatsSheetSelectorsIDs } from './TraderStatsSheet.testIds';

const profile: TraderProfileWithSheetStats = {
  profile: {
    profileId: 'trader-1',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'mint-cat',
    imageUrl: 'https://example.com/a.png',
  },
  stats: {
    pnl30d: 7100,
    winRate30d: 0.58,
    tradeCount30d: 39,
    volumeUsd30d: 386260,
    medianHoldMinutes: 5760,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
  },
  socialHandles: {},
  followerCount: 0,
  followingCount: 0,
  copytradedAllTime: {
    count: 981,
    volumeUSD: 12500,
    distinctActors: 44,
  },
};

describe('TraderStatsSheet', () => {
  it('renders the insights layout with plumbed 30d stats', () => {
    renderWithProvider(
      <TraderStatsSheet
        profile={profile}
        profileHandle="mint-cat"
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.HEADER_HANDLE),
    ).toHaveTextContent('@mint-cat');
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.HERO_PNL),
    ).toHaveTextContent(/\$7,100/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_WIN_RATE),
    ).toHaveTextContent(/58%/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_VOLUME),
    ).toHaveTextContent(/\$386\.3K/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_TRADE_COUNT),
    ).toHaveTextContent(/39/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_HOLD_TIME),
    ).toHaveTextContent(/4d/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.SECTION_BREAKDOWN),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_FOLLOWERS),
    ).toHaveTextContent(/0/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_TRADES_COPIED),
    ).toHaveTextContent(/981/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.SECTION_PERFORMANCE),
    ).toBeOnTheScreen();
  });

  it('leaves missing optional stats blank instead of a dash', () => {
    const emptyProfile: TraderProfileWithSheetStats = {
      ...profile,
      stats: {},
      copytradedAllTime: undefined,
    };

    renderWithProvider(
      <TraderStatsSheet profile={emptyProfile} onClose={jest.fn()} />,
    );

    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.HERO_PNL),
    ).toHaveTextContent('');
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_VOLUME),
    ).toHaveTextContent('Trading volume');
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_TRADES_COPIED),
    ).toHaveTextContent('Trades copied');
  });
});
