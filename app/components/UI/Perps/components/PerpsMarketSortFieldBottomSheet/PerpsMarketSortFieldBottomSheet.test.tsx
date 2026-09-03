import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortFieldBottomSheet from './PerpsMarketSortFieldBottomSheet';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.sort_by': 'Sort by',
      'perps.sort.volume': 'Volume',
      'perps.sort.price_change': 'Price change',
      'perps.sort.funding_rate': 'Funding rate',
      'perps.sort.open_interest': 'Open interest',
      'perps.sort.high_to_low': 'High to low',
      'perps.sort.low_to_high': 'Low to high',
      'perps.sort.apply': 'Apply',
      'perps.sort.reset': 'Reset',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarketSortFieldBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnOptionSelect = jest.fn();

  const renderSheet = (
    overrides: Partial<
      React.ComponentProps<typeof PerpsMarketSortFieldBottomSheet>
    > = {},
  ) =>
    render(
      <PerpsMarketSortFieldBottomSheet
        isVisible
        selectedOptionId="volume"
        sortDirection="desc"
        onClose={mockOnClose}
        onOptionSelect={mockOnOptionSelect}
        testID="sort-field-sheet"
        {...overrides}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('returns null when isVisible is false', () => {
      const { toJSON } = renderSheet({ isVisible: false });

      expect(toJSON()).toBeNull();
    });

    it('renders when isVisible is true', () => {
      renderSheet();

      expect(screen.getByTestId('sort-field-sheet')).toBeOnTheScreen();
      expect(screen.getByText('Sort by')).toBeOnTheScreen();
    });
  });

  describe('Sort Options', () => {
    it('renders all sort options with testIDs', () => {
      renderSheet();

      expect(
        screen.getByTestId('sort-field-sheet-option-volume'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-option-openInterest'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-option-fundingRate'),
      ).toBeOnTheScreen();
    });

    it('shows direction indicator on priceChange option when selected', () => {
      renderSheet({
        selectedOptionId: 'priceChange',
        sortDirection: 'desc',
      });

      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toBeOnTheScreen();
    });

    it('shows direction indicator for all options when selected', () => {
      renderSheet();

      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toHaveTextContent('High to low');
    });
  });

  describe('Draft selection', () => {
    it('does not apply when a different option is pressed', () => {
      renderSheet();

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      expect(mockOnOptionSelect).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not apply when the selected option is pressed to toggle direction', () => {
      renderSheet({
        selectedOptionId: 'priceChange',
        sortDirection: 'desc',
      });

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toHaveTextContent('Low to high');
      expect(mockOnOptionSelect).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Apply', () => {
    it('applies a different option and closes when Apply is pressed', () => {
      renderSheet();

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );
      fireEvent.press(screen.getByTestId('sort-field-sheet-apply'));

      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange',
        'priceChange',
        'desc',
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('applies the toggled direction when Apply is pressed', () => {
      renderSheet({
        selectedOptionId: 'priceChange',
        sortDirection: 'desc',
      });

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );
      fireEvent.press(screen.getByTestId('sort-field-sheet-apply'));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange',
        'priceChange',
        'asc',
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('applies desc direction when a different option is selected then Apply is pressed', () => {
      renderSheet({
        selectedOptionId: 'priceChange',
        sortDirection: 'asc',
      });

      fireEvent.press(screen.getByTestId('sort-field-sheet-option-volume'));
      fireEvent.press(screen.getByTestId('sort-field-sheet-apply'));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'volume',
        'volume',
        'desc',
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('restores the default volume sort in draft without applying', () => {
      renderSheet({
        selectedOptionId: 'priceChange',
        sortDirection: 'asc',
      });

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-fundingRate'),
      );
      fireEvent.press(screen.getByTestId('sort-field-sheet-reset'));

      expect(
        screen.getByTestId('sort-field-sheet-option-volume').props
          .accessibilityState,
      ).toEqual(expect.objectContaining({ selected: true }));
      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toHaveTextContent('High to low');
      expect(mockOnOptionSelect).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('applies the default sort when Reset is followed by Apply', () => {
      renderSheet({
        selectedOptionId: 'priceChange',
        sortDirection: 'asc',
      });

      fireEvent.press(screen.getByTestId('sort-field-sheet-reset'));
      fireEvent.press(screen.getByTestId('sort-field-sheet-apply'));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'volume',
        'volume',
        'desc',
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('State Synchronization', () => {
    it('reflects updated props when reopened', () => {
      const { rerender } = renderSheet();

      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toHaveTextContent('High to low');

      rerender(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="priceChange"
          sortDirection="asc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toHaveTextContent('Low to high');
    });
  });
});
