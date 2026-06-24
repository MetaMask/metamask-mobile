import React from 'react';
import { screen } from '@testing-library/react-native';
import { StyleSheet, Text, type ViewToken } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import type { Trade } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { formatTradeDayLabel } from '../../utils/formatters';
import TraderTradesSection, { resolveTopDayLabel } from './TraderTradesSection';

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
  it('renders the day-grouped section header', () => {
    const trade = makeTrade();
    renderWithProvider(<TraderTradesSection trades={[trade]} />);

    expect(
      screen.getByText(formatTradeDayLabel(trade.timestamp)),
    ).toBeOnTheScreen();
  });

  it('does not render a white underline below the title', () => {
    const trade = makeTrade();
    renderWithProvider(<TraderTradesSection trades={[trade]} />);

    let node: ReactTestInstance | null = screen.getByText(
      formatTradeDayLabel(trade.timestamp),
    );
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

  it('renders the provided list header component', () => {
    renderWithProvider(
      <TraderTradesSection
        trades={[]}
        listHeaderComponent={<Text>PINNED HEADER</Text>}
      />,
    );

    expect(screen.getByText('PINNED HEADER')).toBeOnTheScreen();
  });
});

describe('resolveTopDayLabel', () => {
  it('returns the day label of the top-most visible section', () => {
    const viewableItems = [
      { section: { dayKey: '2026-01-01', dayLabel: 'Jan 1 2026', data: [] } },
      { section: { dayKey: '2026-01-02', dayLabel: 'Jan 2 2026', data: [] } },
    ] as unknown as ViewToken[];

    expect(resolveTopDayLabel(viewableItems)).toBe('Jan 1 2026');
  });

  it('returns null when no section is visible', () => {
    expect(resolveTopDayLabel([])).toBeNull();
  });
});
