import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsProPositionsSortSheet from './PerpsProPositionsSortSheet';
import { DEFAULT_PRO_POSITION_SORT } from '../utils/proPositionSort';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.sort_by': 'Sort by',
      'perps.sort.apply': 'Apply',
      'perps.sort.high_to_low': 'High to low',
      'perps.sort.low_to_high': 'Low to high',
      'perps.pro_positions_panel.sort.position_value': 'Position value',
      'perps.pro_positions_panel.sort.unrealized_pnl': 'Unrealized P&L',
      'perps.pro_positions_panel.sort.funding_rate': 'Funding rate',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsProPositionsSortSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { toJSON } = render(
      <PerpsProPositionsSortSheet
        isVisible={false}
        sortConfig={DEFAULT_PRO_POSITION_SORT}
        onClose={mockOnClose}
        onApply={mockOnApply}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders sort options and default direction for position value', () => {
    render(
      <PerpsProPositionsSortSheet
        isVisible
        sortConfig={DEFAULT_PRO_POSITION_SORT}
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="positions-sort-sheet"
      />,
    );

    expect(screen.getByText('Sort by')).toBeOnTheScreen();
    expect(
      screen.getByTestId('positions-sort-sheet-option-positionValue'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('positions-sort-sheet-direction-text-positionValue'),
    ).toHaveTextContent('High to low');
  });

  it('toggles direction when pressing the selected option and applies on save', () => {
    render(
      <PerpsProPositionsSortSheet
        isVisible
        sortConfig={DEFAULT_PRO_POSITION_SORT}
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="positions-sort-sheet"
      />,
    );

    fireEvent.press(
      screen.getByTestId('positions-sort-sheet-option-positionValue'),
    );
    expect(
      screen.getByTestId('positions-sort-sheet-direction-text-positionValue'),
    ).toHaveTextContent('Low to high');

    fireEvent.press(screen.getByTestId('positions-sort-sheet-apply'));

    expect(mockOnApply).toHaveBeenCalledWith({
      field: 'positionValue',
      direction: 'asc',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('selects a new field with high-to-low default when pressing another option', () => {
    render(
      <PerpsProPositionsSortSheet
        isVisible
        sortConfig={DEFAULT_PRO_POSITION_SORT}
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="positions-sort-sheet"
      />,
    );

    fireEvent.press(
      screen.getByTestId('positions-sort-sheet-option-unrealizedPnl'),
    );
    fireEvent.press(screen.getByTestId('positions-sort-sheet-apply'));

    expect(mockOnApply).toHaveBeenCalledWith({
      field: 'unrealizedPnl',
      direction: 'desc',
    });
  });
});
