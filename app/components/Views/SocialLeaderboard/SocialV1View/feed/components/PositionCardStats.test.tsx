import { screen, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import PositionCardStats, {
  type PositionCardStatRow,
  type PositionCardStatsLayout,
} from './PositionCardStats';

const CARD_ID = 'card-1';

const ROWS: PositionCardStatRow[] = [
  { key: 'entry', label: 'Entry', value: '$1,890', testID: 'stat-entry' },
  { key: 'exit', label: 'Exit', value: '$1,842', testID: 'stat-exit' },
  { key: 'cost', label: 'Cost', value: '$252,300.00', testID: 'stat-cost' },
];

const renderStats = (
  layout?: PositionCardStatsLayout,
  rows: PositionCardStatRow[] = ROWS,
) =>
  renderWithProvider(
    <PositionCardStats rows={rows} cardId={CARD_ID} layout={layout} />,
  );

/**
 * How one stat arranges its own label and value: `row` puts them on a line facing
 * each other, anything else stacks the value under the label.
 */
const statFlexDirection = () =>
  StyleSheet.flatten(screen.getByTestId('stat-entry').props.style)
    ?.flexDirection;

describe('PositionCardStats', () => {
  it('renders every label and value', () => {
    renderStats();

    ROWS.forEach((row) => {
      const stat = screen.getByTestId(row.testID as string);
      expect(within(stat).getByText(row.label)).toBeOnTheScreen();
      expect(within(stat).getByText(row.value as string)).toBeOnTheScreen();
    });
  });

  it('faces each label off against its value by default', () => {
    renderStats();

    expect(statFlexDirection()).toBe('row');
  });

  it('stacks each value under its label in the columns layout', () => {
    renderStats('columns');

    expect(statFlexDirection()).not.toBe('row');
  });

  it('falls back to an em dash rather than dropping a column', () => {
    renderStats('columns', [
      { key: 'cost', label: 'Cost', testID: 'stat-cost' },
    ]);

    expect(
      within(screen.getByTestId('stat-cost')).getByText('\u2014'),
    ).toBeOnTheScreen();
  });

  // Nothing to separate means no divider and no gap left behind it.
  it('renders nothing when there are no stats', () => {
    const { toJSON } = renderStats('columns', []);

    expect(toJSON()).toBeNull();
  });
});
