import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { DEFAULT_PRO_ORDER_SORT } from '../utils/proOrderSort';
import PerpsProOrdersSortSheet from './PerpsProOrdersSortSheet';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.sort_by': 'Sort by',
      'perps.sort.apply': 'Apply',
      'perps.sort.high_to_low': 'High to low',
      'perps.sort.low_to_high': 'Low to high',
      'perps.pro_positions_panel.sort.order_value': 'Order value',
      'perps.pro_positions_panel.sort.size': 'Size',
      'perps.pro_positions_panel.sort.price': 'Price',
      'perps.pro_positions_panel.sort.time': 'Time',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsProOrdersSortSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders order sort options and newest-first default', () => {
    render(
      <PerpsProOrdersSortSheet
        isVisible
        sortConfig={DEFAULT_PRO_ORDER_SORT}
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="orders-sort-sheet"
      />,
    );

    expect(
      screen.getByTestId('orders-sort-sheet-option-orderValue'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('orders-sort-sheet-direction-text-time'),
    ).toHaveTextContent('High to low');
  });

  it('applies a selected order sort field', () => {
    render(
      <PerpsProOrdersSortSheet
        isVisible
        sortConfig={DEFAULT_PRO_ORDER_SORT}
        onClose={mockOnClose}
        onApply={mockOnApply}
        testID="orders-sort-sheet"
      />,
    );

    fireEvent.press(screen.getByTestId('orders-sort-sheet-option-price'));
    fireEvent.press(screen.getByTestId('orders-sort-sheet-apply'));

    expect(mockOnApply).toHaveBeenCalledWith({
      field: 'price',
      direction: 'desc',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
