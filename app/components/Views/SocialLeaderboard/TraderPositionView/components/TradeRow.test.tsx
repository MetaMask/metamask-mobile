import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { lightTheme } from '@metamask/design-tokens';
import {
  AvatarAccount,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import TradeRow from './TradeRow';
import { formatTradeTime } from '../../../../UI/SocialFeed/utils/formatters';

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

const colorOf = (node: ReturnType<typeof screen.getByText>) =>
  (StyleSheet.flatten(node.props.style) as { color?: string } | undefined)
    ?.color;

const REAL_AVATAR_URL = 'https://example.com/avatar.png';
const TRADER_ADDRESS = '0x0000000000000000000000000000000000000001';

describe('TradeRow', () => {
  beforeEach(() => {
    mockPlayImpact.mockClear();
  });

  // Spot names the direction, not the stage: a token row has no LONG/SHORT
  // badge, so the verb is the only buy/sell signal it carries.
  it.each([
    ['opened', 'Bought'],
    ['added', 'Bought'],
    ['reduced', 'Sold'],
    ['closed', 'Sold'],
  ] as const)('renders the spot label for a %s fill', (action, label) => {
    renderWithProvider(<TradeRow trade={baseTrade} action={action} />);

    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(screen.queryByText(/nodestack\.eth/)).toBeNull();
  });

  // Perps read in position-lifecycle language; the LONG/SHORT badge alongside
  // already carries the direction.
  it.each([
    ['opened', 'Opened'],
    ['added', 'Added'],
    ['reduced', 'Reduced'],
    ['closed', 'Closed'],
  ] as const)('renders the perp label for a %s fill', (action, label) => {
    renderWithProvider(
      <TradeRow
        trade={{
          ...baseTrade,
          classification: 'perp',
          perpPositionType: 'long',
        }}
        action={action}
      />,
    );

    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it('renders a time-only timestamp without the date', () => {
    renderWithProvider(<TradeRow trade={baseTrade} action="opened" />);

    expect(
      screen.getByText(formatTradeTime(baseTrade.timestamp)),
    ).toBeOnTheScreen();
  });

  it('renders the avatar image when a real image url is provided', () => {
    renderWithProvider(
      <TradeRow
        trade={baseTrade}
        action="opened"
        traderImageUrl={REAL_AVATAR_URL}
        traderAddress={TRADER_ADDRESS}
      />,
    );

    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
  });

  it('renders the Maskicon fallback when the image url is absent', () => {
    renderWithProvider(
      <TradeRow
        trade={baseTrade}
        action="opened"
        traderAddress={TRADER_ADDRESS}
      />,
    );

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('omits the leverage and direction badges on a perp fill', () => {
    renderWithProvider(
      <TradeRow
        trade={{
          ...baseTrade,
          classification: 'perp',
          perpPositionType: 'long',
          perpLeverage: 2,
        }}
        action="opened"
      />,
    );

    expect(screen.getByText('Opened')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        `trade-row-perp-badges-${baseTrade.transactionHash}`,
      ),
    ).toBeNull();
    expect(screen.queryByText('2x')).toBeNull();
    expect(screen.queryByText('LONG')).toBeNull();
  });

  it('shows a perp fill as its size (margin x leverage) in neutral color, not the margin in green', () => {
    renderWithProvider(
      <TradeRow
        trade={{
          ...baseTrade,
          usdCost: 10.9,
          classification: 'perp',
          perpPositionType: 'short',
          perpLeverage: 3,
        }}
        action="opened"
      />,
    );

    expect(screen.getByText('$32.70')).toBeOnTheScreen();
    expect(screen.queryByText('$10.90')).toBeNull();
    expect(colorOf(screen.getByText('$32.70'))).toBe(
      lightTheme.colors.text.default,
    );
  });

  it('shows a success plus avatar for a positive spot fill', () => {
    renderWithProvider(
      <TradeRow trade={baseTrade} action="opened" showValueAvatar />,
    );

    expect(
      screen.UNSAFE_getByProps({
        name: IconName.Add,
        color: IconColor.SuccessDefault,
        size: IconSize.Lg,
      }),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`trade-row-value-avatar-${baseTrade.transactionHash}`),
    ).toBeOnTheScreen();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('shows an error minus avatar for a negative perp fill', () => {
    renderWithProvider(
      <TradeRow
        trade={{
          ...baseTrade,
          intent: 'exit',
          usdCost: 0,
          classification: 'perp',
          perpPositionType: 'short',
        }}
        action="closed"
        showValueAvatar
      />,
    );

    expect(
      screen.UNSAFE_getByProps({
        name: IconName.Minus,
        color: IconColor.ErrorDefault,
        size: IconSize.Lg,
      }),
    ).toBeTruthy();
  });

  it('calls onPress with the trade when the row is tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <TradeRow trade={baseTrade} action="opened" onPress={onPress} />,
    );

    fireEvent.press(
      screen.getByTestId(`trade-row-${baseTrade.transactionHash}`),
    );

    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.ChartCrosshair);
    expect(onPress).toHaveBeenCalledWith(baseTrade);
  });

  it('does not fire a press when no onPress is provided', () => {
    renderWithProvider(<TradeRow trade={baseTrade} action="opened" />);

    // Disabled Pressable: pressing is a no-op (no throw, nothing to assert beyond render).
    expect(() =>
      fireEvent.press(
        screen.getByTestId(`trade-row-${baseTrade.transactionHash}`),
      ),
    ).not.toThrow();
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });
});
