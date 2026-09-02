import { render, screen } from '@testing-library/react-native';
import React from 'react';
import PerpsProTwapEmptyState from './PerpsProTwapEmptyState';
import type { ProTwapView } from '../utils/proTwapViews';

interface MockTabEmptyStateProps {
  emptyDescriptionKey: string;
  filteredTicker?: string;
  filteredTickerDescriptionKey: string;
  filteredSideDescriptionKey?: string;
}

// Assert the copy key this component selects, not how the shared empty state
// renders it — that component owns its own presentation contract.
jest.mock('./PerpsProTabEmptyState', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return (props: MockTabEmptyStateProps) =>
    ReactLocal.createElement(
      Text,
      { testID: 'tab-empty-state' },
      JSON.stringify(props),
    );
});

describe('PerpsProTwapEmptyState', () => {
  it.each([
    ['active', 'perps.pro_positions_panel.twap_empty'],
    ['history', 'perps.pro_positions_panel.twap_history_empty'],
    ['fill_history', 'perps.pro_positions_panel.twap_fill_history_empty'],
  ])('uses its own copy for the %s view', (view, expectedKey) => {
    // Arrange / Act
    render(<PerpsProTwapEmptyState view={view as ProTwapView} />);

    // Assert: "no active TWAPs" and "no TWAP history" mean different things
    expect(screen.getByTestId('tab-empty-state')).toHaveTextContent(
      new RegExp(`"emptyDescriptionKey":"${expectedKey}"`, 'u'),
    );
  });

  it('passes a ticker filter through to the shared empty state', () => {
    // Arrange / Act
    render(<PerpsProTwapEmptyState view="active" filteredTicker="BTC" />);

    // Assert
    expect(screen.getByTestId('tab-empty-state')).toHaveTextContent(/BTC/u);
  });

  it('passes a side-filter copy key through to the shared empty state', () => {
    // Arrange / Act
    render(
      <PerpsProTwapEmptyState
        view="active"
        filteredSideDescriptionKey="perps.pro_positions_panel.twap_empty_long"
      />,
    );

    // Assert
    expect(screen.getByTestId('tab-empty-state')).toHaveTextContent(
      /twap_empty_long/u,
    );
  });
});
