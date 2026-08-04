import React from 'react';
import { Text } from '@metamask/design-system-react-native';
import { fireEvent } from '@testing-library/react-native';
import { PerpsMode, type PerpsMarketData } from '@metamask/perps-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  PerpsMarketHeaderSelectorsIDs,
  PerpsModeToggleSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
} from '../../Perps.testIds';
import PerpsMarketHeader from './PerpsMarketHeader';
import { createProMarketHeaderTestIDs } from './perpsMarketHeaderTestIds';

jest.mock('../../providers/PerpsStreamManager');

const mockMarket: PerpsMarketData = {
  symbol: 'BTC',
  name: 'Bitcoin',
  price: '$45,000.00',
  change24h: '+$1,125.00',
  change24hPercent: '+2.50%',
  volume: '$1.23B',
  maxLeverage: '40x',
};

const initialState = {
  engine: {
    backgroundState,
  },
};

const renderHeader = (
  overrides: Partial<React.ComponentProps<typeof PerpsMarketHeader>> = {},
) =>
  renderWithProvider(
    <PerpsMarketHeader
      market={mockMarket}
      testIDs={createProMarketHeaderTestIDs()}
      mode={PerpsMode.Pro}
      {...overrides}
    />,
    { state: initialState },
  );

describe('PerpsMarketHeader', () => {
  it('renders the asset name, leverage, and ticker subtitle', () => {
    const { getByTestId, getByText } = renderHeader();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent('Bitcoin');
    expect(getByText('40x')).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE),
    ).toHaveTextContent('BTC-USD perp');
  });

  it('falls back to the display symbol when the market has no name', () => {
    const { getByTestId, queryByText } = renderHeader({
      market: { symbol: 'ETH', maxLeverage: '25x' },
    });

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent('ETH');
    expect(queryByText('Bitcoin')).not.toBeOnTheScreen();
  });

  it('hides the leverage tag when maxLeverage is missing', () => {
    const { getByTestId, queryByText } = renderHeader({
      market: { symbol: 'BTC', name: 'Bitcoin' },
    });

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent('Bitcoin');
    expect(queryByText('40x')).not.toBeOnTheScreen();
  });

  it('strips HIP-3 dex prefixes from the ticker subtitle', () => {
    const { getByTestId } = renderHeader({
      market: { symbol: 'xyz:TSLA', name: 'Tesla', maxLeverage: '10x' },
    });

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent('Tesla');
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE),
    ).toHaveTextContent('TSLA-USD perp');
  });

  it('fires onBackPress from the back button', () => {
    const onBackPress = jest.fn();
    const { getByTestId } = renderHeader({ onBackPress });

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON),
    );

    expect(onBackPress).toHaveBeenCalledTimes(1);
  });

  it('omits the back button when onBackPress is not provided', () => {
    const { queryByTestId } = renderHeader();

    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('fires onIdentityPress from the market identity and shows the caret', () => {
    const onIdentityPress = jest.fn();
    const { getByTestId } = renderHeader({ onIdentityPress });

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON),
    );

    expect(onIdentityPress).toHaveBeenCalledTimes(1);
  });

  it('renders a non-interactive identity when onIdentityPress is omitted', () => {
    const { queryByTestId, getByTestId } = renderHeader();

    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toBeOnTheScreen();
  });

  it('fires onWalletPress from the wallet button', () => {
    const onWalletPress = jest.fn();
    const { getByTestId } = renderHeader({ onWalletPress });

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON),
    );

    expect(onWalletPress).toHaveBeenCalledTimes(1);
  });

  it('fires onFavoritePress from the favorite button', () => {
    const onFavoritePress = jest.fn();
    const { getByTestId } = renderHeader({ onFavoritePress });

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    );

    expect(onFavoritePress).toHaveBeenCalledTimes(1);
  });

  it('renders the filled star when the market is favorited', () => {
    const { getByTestId } = renderHeader({
      onFavoritePress: jest.fn(),
      isFavorite: true,
    });

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('fires onModeChange from the active Pro mode pill', () => {
    const onModeChange = jest.fn();
    const { getByTestId } = renderHeader({ onModeChange });

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));

    expect(onModeChange).toHaveBeenCalledWith(PerpsMode.Lite);
  });

  it('omits the mode pill when mode is not provided', () => {
    const { queryByTestId } = renderHeader({
      mode: undefined,
      onModeChange: jest.fn(),
    });

    expect(
      queryByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    ).not.toBeOnTheScreen();
  });

  it('exposes accessibility labels on back, wallet, and favorite buttons', () => {
    const { getByLabelText } = renderHeader({
      onBackPress: jest.fn(),
      onWalletPress: jest.fn(),
      onFavoritePress: jest.fn(),
      isFavorite: false,
    });

    expect(getByLabelText('Back')).toBeOnTheScreen();
    expect(getByLabelText('Perps balance')).toBeOnTheScreen();
    expect(getByLabelText('Add to watchlist')).toBeOnTheScreen();
  });

  it('uses a state-aware accessibility label for the favorite toggle', () => {
    const { getByLabelText } = renderHeader({
      onFavoritePress: jest.fn(),
      isFavorite: true,
    });

    expect(getByLabelText('Remove from watchlist')).toBeOnTheScreen();
  });

  it('omits end actions when their handlers are not provided', () => {
    const { queryByTestId } = renderHeader();

    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT),
    ).not.toBeOnTheScreen();
  });

  it('renders endAccessory instead of default actions when provided', () => {
    const onFavoritePress = jest.fn();
    const { getByTestId, queryByTestId } = renderHeader({
      onFavoritePress,
      endAccessory: <Text testID="lite-custom-actions">custom</Text>,
    });

    expect(getByTestId('lite-custom-actions')).toBeOnTheScreen();
    expect(
      queryByTestId(PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    ).toBeNull();
  });
});
