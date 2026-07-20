import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Image } from 'expo-image';
import { AvatarAccount } from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import TradeRow from './TradeRow';
import { formatTradeTime } from '../../utils/formatters';

jest.mock('../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  ImpactMoment: { ChartCrosshair: 'chartCrosshair' },
}));

const mockPlayImpact = jest.mocked(playImpact);

const baseTrade: Trade = {
  intent: 'enter',
  direction: 'buy',
  tokenAmount: 1,
  usdCost: 23155.92,
  timestamp: 1_700_000_000_000,
  transactionHash: '0xabc',
};

const REAL_AVATAR_URL = 'https://example.com/avatar.png';
const TRADER_ADDRESS = '0x0000000000000000000000000000000000000001';

describe('TradeRow', () => {
  beforeEach(() => {
    mockPlayImpact.mockClear();
  });

  it('renders the "Bought" label for an enter trade (no trader name)', () => {
    renderWithProvider(<TradeRow trade={baseTrade} />);

    expect(screen.getByText('Bought')).toBeOnTheScreen();
    expect(screen.queryByText(/nodestack\.eth/)).toBeNull();
  });

  it('renders a time-only timestamp without the date', () => {
    renderWithProvider(<TradeRow trade={baseTrade} />);

    expect(
      screen.getByText(formatTradeTime(baseTrade.timestamp)),
    ).toBeOnTheScreen();
  });

  it('renders the "Sold" label for an exit trade (no trader name)', () => {
    renderWithProvider(<TradeRow trade={{ ...baseTrade, intent: 'exit' }} />);

    expect(screen.getByText('Sold')).toBeOnTheScreen();
    expect(screen.queryByText(/nodestack\.eth/)).toBeNull();
  });

  it('renders the avatar image when a real image url is provided', () => {
    renderWithProvider(
      <TradeRow
        trade={baseTrade}
        traderImageUrl={REAL_AVATAR_URL}
        traderAddress={TRADER_ADDRESS}
      />,
    );

    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
  });

  it('renders the Maskicon fallback when the image url is absent', () => {
    renderWithProvider(
      <TradeRow trade={baseTrade} traderAddress={TRADER_ADDRESS} />,
    );

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('calls onPress with the trade when the row is tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(<TradeRow trade={baseTrade} onPress={onPress} />);

    fireEvent.press(
      screen.getByTestId(`trade-row-${baseTrade.transactionHash}`),
    );

    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.ChartCrosshair);
    expect(onPress).toHaveBeenCalledWith(baseTrade);
  });

  it('does not fire a press when no onPress is provided', () => {
    renderWithProvider(<TradeRow trade={baseTrade} />);

    // Disabled Pressable: pressing is a no-op (no throw, nothing to assert beyond render).
    expect(() =>
      fireEvent.press(
        screen.getByTestId(`trade-row-${baseTrade.transactionHash}`),
      ),
    ).not.toThrow();
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });
});
