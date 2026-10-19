import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import MyProfileCompactStats from './MyProfileCompactStats';

describe('MyProfileCompactStats', () => {
  it('renders the win rate and PnL labels', () => {
    renderWithProvider(
      <MyProfileCompactStats
        winRateLabel="100%"
        isWinRatePositive
        pnlLabel="+$224,819"
        hasPnl
        isPnlPositive
      />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.COMPACT_STATS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE),
    ).toHaveTextContent('100%');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_PNL),
    ).toHaveTextContent('+$224,819');
  });

  it('renders fallback labels for unavailable stats', () => {
    renderWithProvider(
      <MyProfileCompactStats
        winRateLabel="—"
        isWinRatePositive={false}
        pnlLabel="—"
        hasPnl={false}
        isPnlPositive={false}
      />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_WIN_RATE),
    ).toHaveTextContent('—');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.HEADER_COMPACT_PNL),
    ).toHaveTextContent('—');
  });
});
