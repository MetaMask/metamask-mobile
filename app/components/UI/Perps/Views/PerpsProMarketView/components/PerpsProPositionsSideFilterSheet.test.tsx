import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsProPositionsSideFilterSheet from './PerpsProPositionsSideFilterSheet';
import { DEFAULT_PRO_POSITION_SIDE_FILTER } from '../utils/proPositionSideFilter';
import { playSelection } from '../../../../../../util/haptics';

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

jest.mock('../../../../../../util/haptics');

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

  it('applies the selected side filter immediately on selection', () => {
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

    expect(mockOnApply).toHaveBeenCalledWith('long');
    expect(mockOnClose).toHaveBeenCalled();
    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('closes without haptic or apply when the current filter is re-selected', () => {
    render(
      <PerpsProPositionsSideFilterSheet
        isVisible
        sideFilter="long"
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="positions-side-filter-sheet"
      />,
    );

    fireEvent.press(
      screen.getByTestId('positions-side-filter-sheet-option-long'),
    );

    expect(mockOnApply).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(playSelection).not.toHaveBeenCalled();
  });
});
