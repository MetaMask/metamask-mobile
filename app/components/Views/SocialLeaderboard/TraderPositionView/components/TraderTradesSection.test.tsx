import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import type { Trade } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { formatTradeDayLabel } from '../../utils/formatters';
import TraderTradesSection from './TraderTradesSection';

const DAY_MS = 24 * 60 * 60 * 1000;

const fireLayout = (node: ReactTestInstance | null, height: number) => {
  let target: ReactTestInstance | null = node;
  while (target && !target.props?.onLayout) {
    target = target.parent;
  }
  if (target) {
    fireEvent(target, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height } },
    });
  }
};

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

  it('hides the in-list section header when it matches the sticky day label', () => {
    const trade = makeTrade();
    const dayLabel = formatTradeDayLabel(trade.timestamp);

    renderWithProvider(
      <TraderTradesSection trades={[trade]} stickyDayLabel={dayLabel} />,
    );

    let node: ReactTestInstance | null = screen.getByText(dayLabel);
    let foundHidden = false;
    while (node) {
      const flat = StyleSheet.flatten(node.props.style) as
        | { opacity?: number }
        | undefined;
      if (flat?.opacity === 0) {
        foundHidden = true;
        break;
      }
      node = node.parent;
    }

    expect(foundHidden).toBe(true);
  });

  it('keeps the in-list section header visible when no sticky day label is set', () => {
    const trade = makeTrade();
    const dayLabel = formatTradeDayLabel(trade.timestamp);

    renderWithProvider(
      <TraderTradesSection trades={[trade]} stickyDayLabel={null} />,
    );

    let node: ReactTestInstance | null = screen.getByText(dayLabel);
    let foundHidden = false;
    while (node) {
      const flat = StyleSheet.flatten(node.props.style) as
        | { opacity?: number }
        | undefined;
      if (flat?.opacity === 0) {
        foundHidden = true;
        break;
      }
      node = node.parent;
    }

    expect(foundHidden).toBe(false);
  });

  it('keeps a non-matching in-list section header visible while a different day is sticky', () => {
    const trade = makeTrade();
    const dayLabel = formatTradeDayLabel(trade.timestamp);

    renderWithProvider(
      <TraderTradesSection
        trades={[trade]}
        stickyDayLabel="Some Other Day 2020"
      />,
    );

    let node: ReactTestInstance | null = screen.getByText(dayLabel);
    let foundHidden = false;
    while (node) {
      const flat = StyleSheet.flatten(node.props.style) as
        | { opacity?: number }
        | undefined;
      if (flat?.opacity === 0) {
        foundHidden = true;
        break;
      }
      node = node.parent;
    }

    expect(foundHidden).toBe(false);
  });

  it('reports section geometry from measured row and header heights', () => {
    const dayOne = 1_700_000_000_000;
    const trades = [
      makeTrade({ transactionHash: '0x1', timestamp: dayOne }),
      makeTrade({ transactionHash: '0x2', timestamp: dayOne + 60_000 }),
      makeTrade({ transactionHash: '0x3', timestamp: dayOne + 2 * DAY_MS }),
    ];
    const onSectionGeometryChange = jest.fn();

    renderWithProvider(
      <TraderTradesSection
        trades={trades}
        onSectionGeometryChange={onSectionGeometryChange}
      />,
    );

    fireLayout(screen.getByTestId('trade-row-0x1'), 60);
    fireLayout(screen.getByText(formatTradeDayLabel(dayOne)), 40);

    const lastCall =
      onSectionGeometryChange.mock.calls[
        onSectionGeometryChange.mock.calls.length - 1
      ]?.[0];
    expect(lastCall).toEqual({
      dayLabels: [
        formatTradeDayLabel(dayOne),
        formatTradeDayLabel(dayOne + 2 * DAY_MS),
      ],
      sectionOffsets: [0, 160],
    });
  });

  it('does not report geometry until both row and header heights are measured', () => {
    const trade = makeTrade();
    const onSectionGeometryChange = jest.fn();

    renderWithProvider(
      <TraderTradesSection
        trades={[trade]}
        onSectionGeometryChange={onSectionGeometryChange}
      />,
    );

    fireLayout(screen.getByTestId(`trade-row-${trade.transactionHash}`), 60);

    expect(onSectionGeometryChange).not.toHaveBeenCalled();
  });
});
