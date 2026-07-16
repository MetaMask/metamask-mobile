import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FeedItemRow from './FeedItemRow';
import type { FeedPerpItem, FeedSpotItem } from '../types';
import {
  getFeedItemTestId,
  getFeedNewPositionTestId,
  getFeedTradeButtonTestId,
  getFeedTradeCardTestId,
  getFeedTraderTestId,
} from '../FeedView.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const spotItem: FeedSpotItem = {
  id: 'spot-1',
  type: 'spot',
  traderId: 'trader-spot-1',
  username: 'dutchiono',
  traderAddress: '0x1111111111111111111111111111111111111111',
  action: 'bought',
  timestamp: Date.now() - 21_000,
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'eip155:1',
  chainIdHex: '0x1',
  subHeader: '$120K at $900K MC',
  valueLabel: '$123,000.5',
  pnlLabel: '+12%',
  hasValueData: true,
  hasPnlData: true,
  isPnlPositive: true,
  tokenAvatar: {
    positionId: 'pos-spot-1',
    chain: 'ethereum',
    tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    tokenImageUrl: null,
    tokenSymbol: 'PEPE',
  },
};

const perpItem: FeedPerpItem = {
  id: 'perp-1',
  type: 'perps',
  traderId: 'trader-perp-1',
  username: 'aparjey',
  traderAddress: '0x2222222222222222222222222222222222222222',
  action: 'closed',
  timestamp: Date.now() - 4 * 60_000,
  marketSymbol: 'ETH',
  marketName: 'Ethereum',
  tradeSymbol: 'ETH',
  direction: 'long',
  leverage: 8,
  subHeader: '$50.6K at $1,701.24',
  valueLabel: '$88,000.5',
  pnlLabel: '+12%',
  hasValueData: true,
  hasPnlData: true,
  isPnlPositive: true,
  tokenAvatar: {
    positionId: 'pos-perp-1',
    chain: 'hyperliquid',
    tokenAddress: '',
    tokenImageUrl: null,
    tokenSymbol: 'ETH',
  },
};

describe('FeedItemRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a spot row with the token symbol, value, and username', () => {
    renderWithProvider(
      <FeedItemRow
        item={spotItem}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId(getFeedItemTestId('spot-1'))).toBeOnTheScreen();
    expect(screen.getByText('PEPE')).toBeOnTheScreen();
    expect(screen.getByText('$123,000.5')).toBeOnTheScreen();
    expect(screen.getByText('dutchiono')).toBeOnTheScreen();
  });

  it('omits value and PnL labels when both fields are missing from the API', () => {
    const item: FeedSpotItem = {
      ...spotItem,
      valueLabel: '',
      pnlLabel: '',
      hasValueData: false,
      hasPnlData: false,
      isPnlPositive: false,
    };

    renderWithProvider(
      <FeedItemRow
        item={item}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(screen.getByText('PEPE')).toBeOnTheScreen();
    expect(screen.queryByText('$123,000.5')).toBeNull();
    expect(screen.queryByText('+12%')).toBeNull();
  });

  it('renders only the available value label when PnL is missing', () => {
    const item: FeedSpotItem = {
      ...spotItem,
      pnlLabel: '',
      hasPnlData: false,
    };

    renderWithProvider(
      <FeedItemRow
        item={item}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(screen.getByText('$123,000.5')).toBeOnTheScreen();
    expect(screen.queryByText('+12%')).toBeNull();
  });

  it('calls onTradePress with the item when Trade is pressed', () => {
    const onTradePress = jest.fn();
    renderWithProvider(
      <FeedItemRow
        item={spotItem}
        onTradePress={onTradePress}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId(getFeedTradeButtonTestId('spot-1')));

    expect(onTradePress).toHaveBeenCalledWith(spotItem);
  });

  it('calls onPositionPress with the item when the detail card is pressed', () => {
    const onPositionPress = jest.fn();
    renderWithProvider(
      <FeedItemRow
        item={spotItem}
        onTradePress={jest.fn()}
        onPositionPress={onPositionPress}
        onTraderPress={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId(getFeedTradeCardTestId('spot-1')));

    expect(onPositionPress).toHaveBeenCalledWith(spotItem);
  });

  it('calls onTraderPress with the item when the trader identity is pressed', () => {
    const onTraderPress = jest.fn();
    renderWithProvider(
      <FeedItemRow
        item={spotItem}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={onTraderPress}
      />,
    );

    fireEvent.press(screen.getByTestId(getFeedTraderTestId('spot-1')));

    expect(onTraderPress).toHaveBeenCalledWith(spotItem);
  });

  it('renders the perp direction badge for a perps row', () => {
    renderWithProvider(
      <FeedItemRow
        item={perpItem}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(screen.getByText('ETH')).toBeOnTheScreen();
    expect(
      screen.getByTestId('feed-item-perp-badges-perp-1'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('feed-item-perp-badges-perp-1-leverage'),
    ).toBeOnTheScreen();
  });

  it('hides the leverage pill when leverage is null', () => {
    renderWithProvider(
      <FeedItemRow
        item={{ ...perpItem, leverage: null }}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('feed-item-perp-badges-perp-1'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('feed-item-perp-badges-perp-1-leverage'),
    ).toBeNull();
  });

  it('shows the "Holding" label on an empty open spot row', () => {
    const item: FeedSpotItem = {
      ...spotItem,
      action: 'bought',
      valueLabel: '',
      pnlLabel: '',
      hasValueData: false,
      hasPnlData: false,
    };

    renderWithProvider(
      <FeedItemRow
        item={item}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(getFeedNewPositionTestId('spot-1')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.new_position.bought'),
    ).toBeOnTheScreen();
  });

  it('shows the "Open" label on an empty open perp row', () => {
    const item: FeedPerpItem = {
      ...perpItem,
      action: 'opened',
      valueLabel: '',
      pnlLabel: '',
      hasValueData: false,
      hasPnlData: false,
    };

    renderWithProvider(
      <FeedItemRow
        item={item}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(
      screen.getByText('social_leaderboard.feed.new_position.opened'),
    ).toBeOnTheScreen();
  });

  it('does not show a new-position label on an empty closed row', () => {
    const item: FeedPerpItem = {
      ...perpItem,
      action: 'closed',
      valueLabel: '',
      pnlLabel: '',
      hasValueData: false,
      hasPnlData: false,
    };

    renderWithProvider(
      <FeedItemRow
        item={item}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId(getFeedNewPositionTestId('perp-1'))).toBeNull();
  });

  it('shows value/PnL and no new-position label when an open row has data', () => {
    renderWithProvider(
      <FeedItemRow
        item={spotItem}
        onTradePress={jest.fn()}
        onPositionPress={jest.fn()}
        onTraderPress={jest.fn()}
      />,
    );

    expect(screen.getByText('$123,000.5')).toBeOnTheScreen();
    expect(screen.getByText('+12%')).toBeOnTheScreen();
    expect(screen.queryByTestId(getFeedNewPositionTestId('spot-1'))).toBeNull();
  });
});
