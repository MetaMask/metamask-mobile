import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortFieldBottomSheet from './PerpsMarketSortFieldBottomSheet';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      filterList: {},
      filterRow: {},
      filterRowActive: {},
      filterRowContent: {},
      toggleContainer: {},
    },
    theme: {
      colors: {
        background: {
          alternative: '#E5E5E5',
        },
        icon: {
          default: '#000000',
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
            onCloseBottomSheet: () => void;
          }>,
        ) => {
          // Expose mock ref methods
          MockReact.useImperativeHandle(ref, () => ({
            onOpenBottomSheet: jest.fn(),
            onCloseBottomSheet: jest.fn(),
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
  '../../../../../component-library/components-temp/SegmentedControl',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return function MockSegmentedControl({
      options,
      selectedValue,
      onValueChange,
      testID,
    }: {
      options: { value: string; label: string }[];
      selectedValue: string;
      onValueChange: (value: string) => void;
      testID?: string;
    }) {
      return (
        <View testID={testID}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              testID={`${testID}-option-${option.value}`}
              onPress={() => onValueChange(option.value)}
            >
              <Text>
                {option.label}{' '}
                {selectedValue === option.value ? '(selected)' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    };
  },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.sort_by': 'Sort By',
      'perps.sort.volume': 'Volume',
      'perps.sort.price_change': '24h Change',
      'perps.sort.funding_rate': 'Funding Rate',
      'perps.sort.open_interest': 'Open Interest',
      'perps.sort.high': 'High',
      'perps.sort.low': 'Low',
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Visibility', () => {
    it('returns null when isVisible is false', () => {
      const { toJSON } = render(
        <PerpsMarketSortFieldBottomSheet
          isVisible={false}
          selectedOptionId="volume"
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
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      expect(
        screen.getByTestId('sort-field-sheet-option-volume'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-option-priceChange-desc'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-option-priceChange-asc'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-option-openInterest'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-option-fundingRate'),
      ).toBeOnTheScreen();
    });

    it('shows checkmark on selected option', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="priceChange-desc"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      expect(
        screen.getByTestId('sort-field-sheet-checkmark-priceChange-desc'),
      ).toBeOnTheScreen();
    });
  });

  describe('Option Selection', () => {
    it('calls onOptionSelect with option ID, field, and direction', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange-desc'),
      );

      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange-desc',
        'priceChange',
        'desc',
      );
    });

    it('auto-closes when option is selected', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange-desc'),
      );

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onOptionSelect for ascending price change option', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedOptionId="volume"
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          testID="sort-field-sheet"
        />,
      );

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange-asc'),
      );

      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange-asc',
        'priceChange',
        'asc',
      );
    });
  });
});
