import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderPositionHeaderTokenLink from './TraderPositionHeaderTokenLink';

// Resolves the tradable perp market set used by the xyz/HIP-3 gating. Mocked
// because the real hook reaches into the Perps stream provider, which this
// minimal-store test does not mount.
const mockUseTradablePerpsMarketSymbols = jest.fn();
jest.mock('../../../../UI/WhatsHappening/hooks', () => ({
  useTradablePerpsMarketSymbols: () => mockUseTradablePerpsMarketSymbols(),
}));

// The link wraps itself in PerpsStreamProvider; stub it to a passthrough so the
// real stream-manager singleton isn't pulled into this minimal-store test.
jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('TraderPositionHeaderTokenLink', () => {
  const setTradableSymbols = (symbols: string[]) => {
    mockUseTradablePerpsMarketSymbols.mockReturnValue({
      tradableSymbols: new Set(symbols),
      isLoading: false,
    });
  };

  it('renders a pressable link that navigates with the resolved target symbol', () => {
    setTradableSymbols(['xyz:SPCX']);
    const onTrade = jest.fn();

    renderWithProvider(
      <TraderPositionHeaderTokenLink
        symbol="cash:SPCX"
        display="SPCX"
        onTrade={onTrade}
        testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL}
        linkTestID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_LINK}
      />,
    );

    const link = screen.getByTestId(
      TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_LINK,
    );
    expect(link).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL,
      ),
    ).toHaveTextContent('SPCX');

    fireEvent.press(link);

    // Remapped from cash:SPCX to its xyz equivalent before navigating.
    expect(onTrade).toHaveBeenCalledWith('xyz:SPCX');
  });

  it('renders a plain, non-pressable symbol for an unsupported market', () => {
    setTradableSymbols(['BTC', 'ETH', 'xyz:OTHER']);
    const onTrade = jest.fn();

    renderWithProvider(
      <TraderPositionHeaderTokenLink
        symbol="cash:SPCX"
        display="SPCX"
        onTrade={onTrade}
        testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL}
        linkTestID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_LINK}
      />,
    );

    expect(
      screen.queryByTestId(
        TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_LINK,
      ),
    ).toBeNull();

    const symbolText = screen.getByTestId(
      TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL,
    );
    expect(symbolText).toHaveTextContent('SPCX');

    fireEvent.press(symbolText);
    expect(onTrade).not.toHaveBeenCalled();
  });
});
