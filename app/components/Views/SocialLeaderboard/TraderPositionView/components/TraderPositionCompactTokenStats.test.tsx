import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderPositionCompactTokenStats from './TraderPositionCompactTokenStats';

describe('TraderPositionCompactTokenStats', () => {
  it('renders the token symbol and a single subtitle row with change and trader', () => {
    const onTraderPress = jest.fn();

    renderWithProvider(
      <TraderPositionCompactTokenStats
        symbol="PEPE"
        pricePercentChange={12.5}
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
    ).toHaveTextContent('+12.5% 1M · trader1');
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
});
