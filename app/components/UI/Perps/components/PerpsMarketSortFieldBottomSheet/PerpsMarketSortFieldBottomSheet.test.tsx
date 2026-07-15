import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortFieldBottomSheet from './PerpsMarketSortFieldBottomSheet';

jest.mock('@metamask/design-system-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  const BottomSheet = MockReact.forwardRef(
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
      MockReact.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: jest.fn(),
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
        },
      }));

      return <View testID={testID}>{children}</View>;
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  const BottomSheetHeader = ({ children }: { children: React.ReactNode }) => (
    <View testID="bottom-sheet-header">{children}</View>
  );

  const ListItemSelect = ({
    title,
    onPress,
    endAccessory,
    testID,
  }: {
    title: string;
    onPress?: () => void;
    endAccessory?: React.ReactNode;
    testID?: string;
  }) => (
    <TouchableOpacity onPress={onPress} testID={testID}>
      <Text>{title}</Text>
      {endAccessory}
    </TouchableOpacity>
  );

  return {
    BottomSheet,
    BottomSheetHeader,
    ListItemSelect,
    Box: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    Text: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <Text testID={testID}>{children}</Text>,
    Icon: ({ testID }: { testID?: string }) => <View testID={testID} />,
    TextVariant: { BodyMd: 'BodyMd' },
    TextColor: { TextAlternative: 'TextAlternative' },
    IconName: { Arrow2Up: 'Arrow2Up', Arrow2Down: 'Arrow2Down' },
    IconSize: { Md: 'Md' },
    IconColor: { IconAlternative: 'IconAlternative' },
  };
});

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

    it('shows direction indicator on priceChange option when selected', () => {
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

      expect(
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toBeOnTheScreen();
    });

    it('shows direction indicator for all options when selected', () => {
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
        screen.getByTestId('sort-field-sheet-direction-indicator'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('sort-field-sheet-direction-text'),
      ).toHaveTextContent('High to low');
    });
  });

  describe('Option Selection', () => {
    it('closes and applies when a different option is pressed', () => {
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

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange',
        'priceChange',
        'desc',
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes and applies with toggled direction when pressing the same option', () => {
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

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'priceChange',
        'priceChange',
        'asc',
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes and applies with desc direction when selecting a different option', () => {
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

      fireEvent.press(screen.getByTestId('sort-field-sheet-option-volume'));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(
        'volume',
        'volume',
        'desc',
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Synchronization', () => {
    it('reflects updated props when reopened', () => {
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
