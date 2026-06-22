import React from 'react';
import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import type { Trade } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TraderTradesSection from './TraderTradesSection';

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  intent: 'enter',
  direction: 'buy',
  tokenAmount: 1,
  usdCost: 23155.92,
  timestamp: 1_700_000_000_000,
  transactionHash: '0xabc',
  ...overrides,
});

describe('TraderTradesSection', () => {
  it('renders the Trades title', () => {
    renderWithProvider(<TraderTradesSection trades={[makeTrade()]} />);

    expect(screen.getByText('Trades')).toBeOnTheScreen();
  });

  it('does not render a white underline below the title', () => {
    renderWithProvider(<TraderTradesSection trades={[makeTrade()]} />);

    let node: ReactTestInstance | null = screen.getByText('Trades');
    while (node) {
      const flat = StyleSheet.flatten(node.props.style) as
        | { borderBottomWidth?: number }
        | undefined;
      expect(flat?.borderBottomWidth).toBeFalsy();
      node = node.parent;
    }
  });

  it('renders a TradeRow for each trade', () => {
    renderWithProvider(
      <TraderTradesSection
        trades={[
          makeTrade({ transactionHash: '0x1', intent: 'enter' }),
          makeTrade({ transactionHash: '0x2', intent: 'exit' }),
        ]}
      />,
    );

    expect(screen.getByText('Bought')).toBeOnTheScreen();
    expect(screen.getByText('Sold')).toBeOnTheScreen();
  });

  it('renders the empty state when there are no trades', () => {
    renderWithProvider(<TraderTradesSection trades={[]} />);

    expect(screen.queryByText('Bought')).toBeNull();
    expect(screen.queryByText('Sold')).toBeNull();
  });
});
