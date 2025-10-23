import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortFieldBottomSheet from './PerpsMarketSortFieldBottomSheet';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      optionsGrid: {},
      option: {},
      optionActive: {},
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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.sort_by': 'Sort By',
      'perps.sort.volume': 'Volume',
      'perps.sort.price_change': '24h Change',
      'perps.sort.funding_rate': 'Funding Rate',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarketSortFieldBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnSortSelect = jest.fn();

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
          selectedSort="volume"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders when isVisible is true', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedSort="volume"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
        />,
      );

      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });
  });

  describe('Sort Options', () => {
    it('renders volume option with testID', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedSort="volume"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
          testID="sort-field-sheet"
        />,
      );

      expect(
        screen.getByTestId('sort-field-sheet-option-volume'),
      ).toBeOnTheScreen();
    });

    it('renders priceChange option with testID', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedSort="priceChange"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
          testID="sort-field-sheet"
        />,
      );

      expect(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      ).toBeOnTheScreen();
    });

    it('renders fundingRate option with testID', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedSort="fundingRate"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
          testID="sort-field-sheet"
        />,
      );

      expect(
        screen.getByTestId('sort-field-sheet-option-fundingRate'),
      ).toBeOnTheScreen();
    });
  });

  describe('Interactions', () => {
    it('calls onSortSelect and onClose when volume option is pressed', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedSort="priceChange"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
          testID="sort-field-sheet"
        />,
      );

      fireEvent.press(screen.getByTestId('sort-field-sheet-option-volume'));

      expect(mockOnSortSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSortSelect).toHaveBeenCalledWith('volume');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSortSelect and onClose when priceChange option is pressed', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedSort="volume"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
          testID="sort-field-sheet"
        />,
      );

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-priceChange'),
      );

      expect(mockOnSortSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSortSelect).toHaveBeenCalledWith('priceChange');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSortSelect and onClose when fundingRate option is pressed', () => {
      render(
        <PerpsMarketSortFieldBottomSheet
          isVisible
          selectedSort="volume"
          onClose={mockOnClose}
          onSortSelect={mockOnSortSelect}
          testID="sort-field-sheet"
        />,
      );

      fireEvent.press(
        screen.getByTestId('sort-field-sheet-option-fundingRate'),
      );

      expect(mockOnSortSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSortSelect).toHaveBeenCalledWith('fundingRate');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
