import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsProPositionsSideFilterSheet from './PerpsProPositionsSideFilterSheet';
import { DEFAULT_PRO_POSITION_SIDE_FILTER } from '../utils/proPositionSideFilter';

jest.mock('./ProPositionSideFilterIcon', () => 'ProPositionSideFilterIcon');

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.market_type.filter_by': 'Filter by',
      'perps.sort.apply': 'Apply',
      'perps.pro_positions_panel.side_filter.all_sides': 'All sides',
      'perps.pro_positions_panel.side_filter.long': 'Long',
      'perps.pro_positions_panel.side_filter.short': 'Short',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsProPositionsSideFilterSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { toJSON } = render(
      <PerpsProPositionsSideFilterSheet
        isVisible={false}
        sideFilter={DEFAULT_PRO_POSITION_SIDE_FILTER}
        onClose={mockOnClose}
        onApply={mockOnApply}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders side filter options', () => {
    render(
      <PerpsProPositionsSideFilterSheet
        isVisible
        sideFilter={DEFAULT_PRO_POSITION_SIDE_FILTER}
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="positions-side-filter-sheet"
      />,
    );

    expect(screen.getByText('Filter by')).toBeOnTheScreen();
    expect(screen.getByText('All sides')).toBeOnTheScreen();
    expect(screen.getByText('Long')).toBeOnTheScreen();
    expect(screen.getByText('Short')).toBeOnTheScreen();
  });

  it('applies the selected side filter on save', () => {
    render(
      <PerpsProPositionsSideFilterSheet
        isVisible
        sideFilter={DEFAULT_PRO_POSITION_SIDE_FILTER}
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="positions-side-filter-sheet"
      />,
    );

    fireEvent.press(
      screen.getByTestId('positions-side-filter-sheet-option-long'),
    );
    fireEvent.press(screen.getByTestId('positions-side-filter-sheet-apply'));

    expect(mockOnApply).toHaveBeenCalledWith('long');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
