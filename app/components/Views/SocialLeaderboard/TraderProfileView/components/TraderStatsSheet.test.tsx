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
    name: 'trader1',
  },
  stats: {
    pnl30d: 7100,
    winRate30d: 0.81,
    tradeCount30d: 99,
    volumeUsd30d: 354520,
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
  it('renders plumbed 30d stats rows', () => {
    renderWithProvider(
      <TraderStatsSheet profile={profile} onClose={jest.fn()} />,
    );

    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_PNL),
    ).toHaveTextContent(/\+\$7,100/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_WIN_RATE),
    ).toHaveTextContent(/81%/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_VOLUME),
    ).toHaveTextContent(/\$354\.5K/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_TRADE_COUNT),
    ).toHaveTextContent(/99/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_HOLD_TIME),
    ).toHaveTextContent(/4 days/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_FOLLOWERS),
    ).toHaveTextContent(/0/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_TRADES_COPIED),
    ).toHaveTextContent(/981/);
  });

  it('renders dashes and zero copy count when optional stats are missing', () => {
    const emptyProfile: TraderProfileWithSheetStats = {
      ...profile,
      stats: {},
      copytradedAllTime: undefined,
    };

    renderWithProvider(
      <TraderStatsSheet profile={emptyProfile} onClose={jest.fn()} />,
    );

    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_PNL),
    ).toHaveTextContent(/\u2014/);
    expect(
      screen.getByTestId(TraderStatsSheetSelectorsIDs.ROW_TRADES_COPIED),
    ).toHaveTextContent(/0/);
  });
});
