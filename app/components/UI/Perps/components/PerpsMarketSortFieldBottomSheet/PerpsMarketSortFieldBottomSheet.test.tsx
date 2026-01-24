import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortFieldBottomSheet from './PerpsMarketSortFieldBottomSheet';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      optionsList: {},
      optionRow: {},
      optionRowSelected: {},
      arrowContainer: {},
      applyButton: {},
      applyButtonText: {},
    },
    theme: {
      colors: {
        background: {
          alternative: '#E5E5E5',
          muted: '#F0F0F0',
        },
        icon: {
          default: '#000000',
          inverse: '#FFFFFF',
        },
        border: {
          muted: '#D6D6D6',
        },
      },
    },
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: MockReact.forwardRef(
        (
          {
            children,
            testID,
          }: {
            children: React.ReactNode;
            testID?: string;
          },
          ref: React.Ref<{
            onOpenBottomSheet: () => void;
            onCloseBottomSheet: (callback?: () => void) => void;
          }>,
        ) => {
          // Expose mock ref methods
          MockReact.useImperativeHandle(ref, () => ({
            onOpenBottomSheet: jest.fn(),
            onCloseBottomSheet: (callback?: () => void) => {
              callback?.();
            },
          }));

          return <View testID={testID}>{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return function MockBottomSheetHeader({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return <View testID="bottom-sheet-header">{children}</View>;
    };
  },
);

jest.mock(
  '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase',
  () => {
    const { TouchableOpacity, View } = jest.requireActual('react-native');
    return ({
      label,
      onPress,
      style,
      testID,
    }: {
      label?: React.ReactNode;
      onPress?: () => void;
      style?: unknown;
      testID?: string;
    }) => (
      <TouchableOpacity onPress={onPress} style={style} testID={testID}>
        <View>{label}</View>
      </TouchableOpacity>
    );
  },
);

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
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarketSortFieldBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnOptionSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('returns null when isVisible is false', () => {
      const { toJSON } = render(
        <PerpsMarketSortFieldBottomSheet
          isVisible={false}
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders when isVisible is true', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
        />,
      );

      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });
  });

  describe('Sort Options', () => {
    it('renders all sort options with testIDs', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

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

    it('shows direction indicator only on priceChange option when selected', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="priceChange"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Check that direction indicator is present for priceChange
      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toBeOnTheScreen();
    });

    it('shows checkmark for non-priceChange options when selected', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Should show checkmark for volume
      expect(
        screen.getByTestId('sort-field-sheet-checkmark-volume'),
      ).toBeOnTheScreen();

      // Should not show direction indicator
      expect(
        screen.queryByTestId('sort-field-sheet-direction-indicator'),
      ).not.toBeOnTheScreen();
    });

    it('renders apply button', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      expect(
        screen.getByTestId('sort-field-sheet-apply-button'),
      ).toBeOnTheScreen();
    });
  });

  describe('Option Selection', () => {
    it('selects a different option when pressed', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Initially volume is selected (has checkmark)
      expect(
        screen.getByTestId('sort-field-sheet-checkmark-volume'),
      ).toBeOnTheScreen();

      // Press priceChange option
      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      // Now priceChange should have direction indicator
      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();

      // onOptionSelect should NOT be called until Apply is pressed
      expect(mockOnOptionSelect).not.toHaveBeenCalled();
    });

    it('toggles direction when pressing the same priceChange option', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="priceChange"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Direction indicator should be visible initially
      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();

      // Press priceChange again to toggle direction
      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      // Direction indicator should still be visible (direction toggled internally)
      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();

      // onOptionSelect should NOT be called until Apply is pressed
      expect(mockOnOptionSelect).not.toHaveBeenCalled();
    });

    it('does not toggle direction for non-priceChange options when pressed again', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Volume should have checkmark
      expect(
        screen.getByTestId('sort-field-sheet-checkmark-volume'),
      ).toBeOnTheScreen();

      // Press volume again (same option)
      fireEvent.press(screen.getByTestId('sort-field-sheet-option-volume'));

      // Should still show checkmark, not direction indicator
      expect(
        screen.getByTestId('sort-field-sheet-checkmark-volume'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('sort-field-sheet-direction-indicator'),
      ).not.toBeOnTheScreen();

      // onOptionSelect should NOT be called until Apply is pressed
      expect(mockOnOptionSelect).not.toHaveBeenCalled();
    });

    it('calls onOptionSelect and closes when Apply button is pressed', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Select priceChange option
      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      // Press Apply button
      fireEvent.press(screen.getByTestId('sort-field-sheet-apply-button'));

      // Should call onOptionSelect with correct parameters
      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange',
        'priceChange',
        'desc',
      );

      // Should call onClose
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onOptionSelect with toggled direction when Apply is pressed for priceChange', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="priceChange"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Toggle direction
      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      // Press Apply
      fireEvent.press(screen.getByTestId('sort-field-sheet-apply-button'));

      // Should call with ascending direction (toggled from desc to asc)
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange',
        'priceChange',
        'asc',
      );
    });

    it('calls onOptionSelect with desc direction for non-priceChange options', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="priceChange"
          sortDirection="asc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Select volume option
      fireEvent.press(screen.getByTestId('sort-field-sheet-option-volume'));

      // Press Apply
      fireEvent.press(screen.getByTestId('sort-field-sheet-apply-button'));

      // Should call with desc direction (default for new selection)
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'volume',
        'volume',
        'desc',
      );
    });

    it('does not auto-close when option is selected (waits for Apply)', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Select an option
      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      // Should NOT close yet
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnOptionSelect).not.toHaveBeenCalled();
    });
  });

  describe('State Synchronization', () => {
    it('syncs local state when props change', () => {
      const { rerender } = render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Initially volume is selected
      expect(
        screen.getByTestId('sort-field-sheet-checkmark-volume'),
      ).toBeOnTheScreen();

      // Change props to priceChange with asc direction
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

      // Now priceChange should have direction indicator
      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();
      // Volume checkmark should be gone
      expect(
        screen.queryByTestId('sort-field-sheet-checkmark-volume'),
      ).not.toBeOnTheScreen();
    });

    it('resets uncommitted changes when reopening the sheet', () => {
      const { rerender } = render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Initially volume is selected
      expect(
        screen.getByTestId('sort-field-sheet-checkmark-volume'),
      ).toBeOnTheScreen();

      // User makes changes without applying - select priceChange
      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      // Now priceChange should be selected locally
      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();

      // User closes the sheet without applying
      rerender(
        <PerpsMarketSortFieldBottomSheet
          isVisible={false}
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // User reopens the sheet - props haven't changed (still volume)
      rerender(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          sortDirection="desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      // Local state should be reset to volume (uncommitted changes discarded)
      expect(
        screen.getByTestId('sort-field-sheet-checkmark-volume'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('sort-field-sheet-direction-indicator'),
      ).not.toBeOnTheScreen();
    });
  });
});
