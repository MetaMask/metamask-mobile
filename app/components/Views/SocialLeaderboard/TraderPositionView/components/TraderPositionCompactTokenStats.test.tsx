import { fireEvent, screen, within } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderPositionCompactTokenStats from './TraderPositionCompactTokenStats';

// The perp header token link resolves the tradable market set and mounts a
// PerpsStreamProvider; mock both so the spot tests need no perps wiring and the
// perp test can drive support state directly.
const mockUseTradablePerpsMarketSymbols = jest.fn().mockReturnValue({
  tradableSymbols: new Set<string>(),
  isLoading: false,
});
jest.mock('../../../../UI/WhatsHappening/hooks', () => ({
  useTradablePerpsMarketSymbols: () => mockUseTradablePerpsMarketSymbols(),
}));
jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

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

  it('wraps the token symbol in a tappable link and navigates to the resolved market for perps', () => {
    mockUseTradablePerpsMarketSymbols.mockReturnValueOnce({
      tradableSymbols: new Set(['xyz:SPCX']),
      isLoading: false,
    });
    const onTokenNavigate = jest.fn();

    renderWithProvider(
      <TraderPositionCompactTokenStats
        symbol="SPCX"
        pricePercentChange={1.23}
        activeTimePeriodLabel="1D"
        traderName="trader1"
        perpDirection="long"
        perpMarketSymbol="cash:SPCX"
        onTokenNavigate={onTokenNavigate}
        onTraderPress={jest.fn()}
      />,
    );

    const link = screen.getByTestId(
      TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_LINK,
    );
    expect(
      within(link).getByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL,
      ),
    ).toHaveTextContent('SPCX');

    fireEvent.press(link);

    expect(onTokenNavigate).toHaveBeenCalledWith('xyz:SPCX');
  });

  it('renders a non-tappable token symbol for spot (no navigate handler)', () => {
    renderWithProvider(
      <TraderPositionCompactTokenStats
        symbol="PEPE"
        pricePercentChange={12.54}
        activeTimePeriodLabel="1M"
        traderName="trader1"
        onTraderPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL,
      ),
    ).toHaveTextContent('PEPE');
    expect(
      screen.queryByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_LINK,
      ),
    ).toBeNull();
  });
});
