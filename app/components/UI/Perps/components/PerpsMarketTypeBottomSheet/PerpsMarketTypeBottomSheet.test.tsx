import React from 'react';
import { View, TouchableOpacity, Text as RNText } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketTypeBottomSheet from './PerpsMarketTypeBottomSheet';
import type { MarketTypeFilter } from '../../controllers/types';

// Mock the i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.home.tabs.all': 'All',
      'perps.home.tabs.crypto': 'Crypto',
      'perps.home.tabs.stocks_and_commodities': 'Stocks & Commodities',
      'perps.market_type.filter_by': 'Filter by',
    };
    return translations[key] || key;
  },
}));

// Mock BottomSheet component
const mockOnOpenBottomSheet = jest.fn();
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockBottomSheet = React.forwardRef<
      { onOpenBottomSheet: () => void },
      {
        children: React.ReactNode;
        testID?: string;
        onClose: () => void;
      }
    >(({ children, testID }, ref) => {
      React.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: mockOnOpenBottomSheet,
      }));
      return <View testID={testID}>{children}</View>;
    });
    MockBottomSheet.displayName = 'MockBottomSheet';
    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

// Mock BottomSheetHeader component
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => ({
    __esModule: true,
    default: ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <View>
        {children}
        <TouchableOpacity testID="bottom-sheet-close" onPress={onClose}>
          <RNText>Close</RNText>
        </TouchableOpacity>
      </View>
    ),
  }),
);

// Mock Icon component
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: ({ name, testID }: { name: string; testID?: string }) => (
    <RNText testID={testID}>{name}</RNText>
  ),
  IconName: {
    Check: 'Check',
  },
  IconSize: { Md: 'md' },
}));

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => <RNText testID={testID}>{children}</RNText>,
  TextVariant: { HeadingMD: 'HeadingMD', BodyMD: 'BodyMD' },
}));

// Mock Box component
jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({
    children,
    testID,
    style,
  }: {
    children: React.ReactNode;
    testID?: string;
    style?: object;
  }) => (
    <View testID={testID} style={style}>
      {children}
    </View>
  ),
}));

describe('PerpsMarketTypeBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnFilterSelect = jest.fn();

  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    selectedFilter: 'all' as MarketTypeFilter,
    onFilterSelect: mockOnFilterSelect,
    testID: 'market-type-sheet',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isVisible is false', () => {
      const { toJSON } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders when isVisible is true', () => {
      const { toJSON } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('renders header with correct title', () => {
      const { getByText } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} />,
      );

      expect(getByText('Filter by')).toBeTruthy();
    });

    it('renders all market type options', () => {
      const { getByText } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Crypto')).toBeTruthy();
      expect(getByText('Stocks & Commodities')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} />,
      );

      expect(getByTestId('market-type-sheet')).toBeTruthy();
    });

    it('renders option testIDs', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} />,
      );

      expect(getByTestId('market-type-sheet-option-all')).toBeTruthy();
      expect(getByTestId('market-type-sheet-option-crypto')).toBeTruthy();
      expect(
        getByTestId('market-type-sheet-option-stocks_and_commodities'),
      ).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    it('shows checkmark for selected "all" filter', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} selectedFilter="all" />,
      );

      expect(getByTestId('market-type-sheet-checkmark-all')).toBeTruthy();
    });

    it('shows checkmark for selected "crypto" filter', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet
          {...defaultProps}
          selectedFilter="crypto"
        />,
      );

      expect(getByTestId('market-type-sheet-checkmark-crypto')).toBeTruthy();
    });

    it('shows checkmark for selected "stocks_and_commodities" filter', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet
          {...defaultProps}
          selectedFilter="stocks_and_commodities"
        />,
      );

      expect(
        getByTestId('market-type-sheet-checkmark-stocks_and_commodities'),
      ).toBeTruthy();
    });

    it('only shows one checkmark at a time', () => {
      const { queryByTestId } = render(
        <PerpsMarketTypeBottomSheet
          {...defaultProps}
          selectedFilter="crypto"
        />,
      );

      expect(queryByTestId('market-type-sheet-checkmark-crypto')).toBeTruthy();
      expect(queryByTestId('market-type-sheet-checkmark-all')).toBeNull();
      expect(
        queryByTestId('market-type-sheet-checkmark-stocks_and_commodities'),
      ).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('calls onFilterSelect and onClose when "all" option is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet
          {...defaultProps}
          selectedFilter="crypto"
        />,
      );

      const allOption = getByTestId('market-type-sheet-option-all');
      fireEvent.press(allOption);

      expect(mockOnFilterSelect).toHaveBeenCalledWith('all');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onFilterSelect and onClose when "crypto" option is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} selectedFilter="all" />,
      );

      const cryptoOption = getByTestId('market-type-sheet-option-crypto');
      fireEvent.press(cryptoOption);

      expect(mockOnFilterSelect).toHaveBeenCalledWith('crypto');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onFilterSelect and onClose when "stocks_and_commodities" option is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} selectedFilter="all" />,
      );

      const stocksOption = getByTestId(
        'market-type-sheet-option-stocks_and_commodities',
      );
      fireEvent.press(stocksOption);

      expect(mockOnFilterSelect).toHaveBeenCalledWith('stocks_and_commodities');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button in header is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} />,
      );

      const closeButton = getByTestId('bottom-sheet-close');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visibility Effect', () => {
    it('calls onOpenBottomSheet when isVisible changes to true', () => {
      const { rerender } = render(
        <PerpsMarketTypeBottomSheet {...defaultProps} isVisible={false} />,
      );

      mockOnOpenBottomSheet.mockClear();

      rerender(<PerpsMarketTypeBottomSheet {...defaultProps} isVisible />);

      expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
    });
  });
});
