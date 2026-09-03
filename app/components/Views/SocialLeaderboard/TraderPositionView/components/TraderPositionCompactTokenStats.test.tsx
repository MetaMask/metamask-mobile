import { fireEvent, screen, within } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderPositionCompactTokenStats from './TraderPositionCompactTokenStats';

describe('TraderPositionCompactTokenStats', () => {
  it('renders trader on the first row and token change on the second', () => {
    const onTraderPress = jest.fn();

    renderWithProvider(
      <TraderPositionCompactTokenStats
        symbol="PEPE"
        pricePercentChange={12.54}
        activeTimePeriodLabel="1M"
        traderName="trader1"
        onTraderPress={onTraderPress}
      />,
    );

    expect(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL,
      ),
    ).toHaveTextContent('PEPE');
    expect(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_CHANGE,
      ),
    ).toHaveTextContent('PEPE+12.54%1M');
    expect(
      within(
        screen.getByTestId(
          TraderPositionViewSelectorsIDs.HEADER_COMPACT_TRADER_LINK,
        ),
      ).getByText('trader1'),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TRADER_LINK,
      ),
    );

    expect(onTraderPress).toHaveBeenCalledTimes(1);
  });

  it('renders perp leverage and direction badges beside the trader on the first row', () => {
    renderWithProvider(
      <TraderPositionCompactTokenStats
        symbol="BTC"
        pricePercentChange={-4.69}
        activeTimePeriodLabel="1W"
        traderName="trader1"
        perpDirection="short"
        perpLeverage={3}
        onTraderPress={jest.fn()}
      />,
    );

    expect(
      within(
        screen.getByTestId(
          TraderPositionViewSelectorsIDs.HEADER_COMPACT_PERP_BADGES,
        ),
      ).getByText('3x'),
    ).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(
          TraderPositionViewSelectorsIDs.HEADER_COMPACT_PERP_BADGES,
        ),
      ).getByText('SHORT'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.COMPACT_TOKEN_STATS),
    ).toHaveTextContent('trader13xSHORTBTC-4.69%1W');
    expect(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_CHANGE,
      ),
    ).toHaveTextContent('BTC-4.69%1W');
  });
});
