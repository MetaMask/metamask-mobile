import { fireEvent, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderTokenInfoRow from './TraderTokenInfoRow';

// Resolves the tradable perp market set used by the xyz/HIP-3 gating. Mocked
// because the real hook reaches into the Perps stream provider, which this
// minimal-store test does not mount.
const mockUseTradablePerpsMarketSymbols = jest.fn();
jest.mock('../../../../UI/WhatsHappening/hooks', () => ({
  useTradablePerpsMarketSymbols: () => mockUseTradablePerpsMarketSymbols(),
}));

// The perp token link wraps itself in PerpsStreamProvider; stub it to a
// passthrough so the real stream-manager singleton isn't pulled in.
jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// Presentational children unrelated to the navigation behavior under test.
jest.mock('../../components/PositionTokenAvatar', () => () => null);
jest.mock('../../components/PerpBadges', () => () => null);

const perpPosition = {
  tokenSymbol: 'cash:SPCX',
  chain: 'hyperliquid',
  perpPositionType: 'long',
  perpLeverage: 2,
} as unknown as Position;

const spotPosition = {
  tokenSymbol: 'PEPE',
  tokenAddress: '0x0000000000000000000000000000000000000001',
  chain: 'base',
} as unknown as Position;

const setTradableSymbols = (symbols: string[]) => {
  mockUseTradablePerpsMarketSymbols.mockReturnValue({
    tradableSymbols: new Set(symbols),
    isLoading: false,
  });
};

const renderPerpRow = (
  overrides: Partial<React.ComponentProps<typeof TraderTokenInfoRow>> = {},
) =>
  renderWithProvider(
    <TraderTokenInfoRow
      symbol="SPCX"
      position={perpPosition}
      marketCap={undefined}
      currentPrice={191.6}
      pricePercentChange={-0.35}
      activeTimePeriodLabel="1H"
      perpMarketSymbol="cash:SPCX"
      onTokenNavigate={jest.fn()}
      tokenNavigateTestID={TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW_LINK}
      {...overrides}
    />,
  );

describe('TraderTokenInfoRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('links the perp token box to the market and navigates with the resolved symbol', () => {
    setTradableSymbols(['xyz:SPCX']);
    const onTokenNavigate = jest.fn();

    renderPerpRow({ onTokenNavigate });

    const link = screen.getByTestId(
      TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW_LINK,
    );
    expect(link).toBeOnTheScreen();
    expect(screen.getByText('SPCX')).toBeOnTheScreen();

    fireEvent.press(link);

    // cash:SPCX is remapped to its xyz equivalent before navigating.
    expect(onTokenNavigate).toHaveBeenCalledWith('xyz:SPCX');
  });

  it('does not link when the resolved perp market is unsupported', () => {
    setTradableSymbols(['BTC', 'ETH']);
    const onTokenNavigate = jest.fn();

    renderPerpRow({ onTokenNavigate });

    expect(
      screen.queryByTestId(TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW_LINK),
    ).toBeNull();
    expect(screen.getByText('SPCX')).toBeOnTheScreen();
    expect(onTokenNavigate).not.toHaveBeenCalled();
  });

  it('does not link a perp box when no navigate handler is provided', () => {
    setTradableSymbols(['xyz:SPCX']);

    renderPerpRow({ onTokenNavigate: undefined, perpMarketSymbol: undefined });

    expect(
      screen.queryByTestId(TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW_LINK),
    ).toBeNull();
  });

  it('links the spot token box to the token page and keeps copy as a separate control', () => {
    setTradableSymbols([]);
    const onTokenPress = jest.fn();
    const onCopyTokenAddress = jest.fn();

    renderWithProvider(
      <TraderTokenInfoRow
        symbol="PEPE"
        position={spotPosition}
        marketCap={1_000_000}
        currentPrice={undefined}
        pricePercentChange={1.2}
        activeTimePeriodLabel="1H"
        onCopyTokenAddress={onCopyTokenAddress}
        copyTokenAddressTestID={
          TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON
        }
        onTokenPress={onTokenPress}
        tokenNavigateTestID={TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW_LINK}
      />,
    );

    // The token box navigates to the token page.
    fireEvent.press(
      screen.getByTestId(TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW_LINK),
    );
    expect(onTokenPress).toHaveBeenCalledTimes(1);

    // Copy is now a separate, independent control (not the whole box).
    fireEvent.press(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON,
      ),
    );
    expect(onCopyTokenAddress).toHaveBeenCalledTimes(1);
  });

  it('keeps the spot copy affordance and never renders the perp link', () => {
    setTradableSymbols(['xyz:SPCX']);
    const onCopyTokenAddress = jest.fn();

    renderWithProvider(
      <TraderTokenInfoRow
        symbol="PEPE"
        position={spotPosition}
        marketCap={1_000_000}
        currentPrice={undefined}
        pricePercentChange={1.2}
        activeTimePeriodLabel="1H"
        onCopyTokenAddress={onCopyTokenAddress}
        copyTokenAddressTestID={
          TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON
        }
      />,
    );

    expect(
      screen.queryByTestId(TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW_LINK),
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON,
      ),
    );
    expect(onCopyTokenAddress).toHaveBeenCalled();
  });
});
