import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortFilters from './PerpsMarketSortFilters';
import type { PerpsMarketSortFiltersProps } from './PerpsMarketSortFilters.types';

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      sortRow: {},
      sortChip: {},
      sortChipSelected: {},
      directionRow: {},
      directionButton: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.volume': 'Volume',
      'perps.sort.price_change': 'Price Change',
      'perps.sort.funding_rate': 'Funding Rate',
      'perps.sort.high_to_low': 'High to Low',
      'perps.sort.low_to_high': 'Low to High',
    };
    return translations[key] || key;
  },
}));

jest.mock('../../constants/perpsConfig', () => ({
  MARKET_SORTING_CONFIG: {
    SORT_BUTTON_PRESETS: [
      { field: 'volume', labelKey: 'perps.sort.volume' },
      { field: 'priceChange', labelKey: 'perps.sort.price_change' },
      { field: 'fundingRate', labelKey: 'perps.sort.funding_rate' },
    ],
  },
}));

jest.mock('./PerpsMarketSortFilters.styles', () => ({}));

jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: 'Text',
  TextVariant: {
    BodySM: 'BodySM',
  },
  TextColor: {
    Primary: 'Primary',
    Default: 'Default',
    Alternative: 'Alternative',
  },
}));
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: 'ButtonIcon',
    ButtonIconSizes: {
      Sm: 'Sm',
    },
  }),
);
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
  },
  IconColor: {
    Alternative: 'Alternative',
  },
}));

describe('PerpsMarketSortFilters', () => {
  const mockOnSortChange = jest.fn();
  const mockOnDirectionToggle = jest.fn();

  const defaultProps: PerpsMarketSortFiltersProps = {
    sortBy: 'volume',
    direction: 'desc',
    onSortChange: mockOnSortChange,
    onDirectionToggle: mockOnDirectionToggle,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default sort options', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsMarketSortFilters {...defaultProps} />);

    // Assert
    expect(getByText('Volume')).toBeTruthy();
    expect(getByText('Price Change')).toBeTruthy();
    expect(getByText('Funding Rate')).toBeTruthy();
  });

  it('calls onSortChange when sort chip is pressed', () => {
    // Arrange
    const { getByTestId } = render(
      <PerpsMarketSortFilters {...defaultProps} />,
    );

    // Act
    const priceChangeChip = getByTestId(
      'perps-market-sort-filters-chip-priceChange',
    );
    fireEvent.press(priceChangeChip);

    // Assert
    expect(mockOnSortChange).toHaveBeenCalledWith('priceChange');
  });

  it('calls onDirectionToggle when direction button is pressed', () => {
    // Arrange
    const { getByTestId } = render(
      <PerpsMarketSortFilters {...defaultProps} />,
    );

    // Act
    const directionButton = getByTestId(
      'perps-market-sort-filters-direction-toggle',
    );
    fireEvent.press(directionButton);

    // Assert
    expect(mockOnDirectionToggle).toHaveBeenCalledTimes(1);
  });

  it('renders all sort chips with correct testIDs', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <PerpsMarketSortFilters {...defaultProps} />,
    );

    // Assert
    expect(getByTestId('perps-market-sort-filters-chip-volume')).toBeTruthy();
    expect(
      getByTestId('perps-market-sort-filters-chip-priceChange'),
    ).toBeTruthy();
    expect(
      getByTestId('perps-market-sort-filters-chip-fundingRate'),
    ).toBeTruthy();
  });

  it('renders with custom testID', () => {
    // Arrange
    const customTestID = 'custom-sort-filters';

    // Act
    const { getByTestId } = render(
      <PerpsMarketSortFilters {...defaultProps} testID={customTestID} />,
    );

    // Assert
    expect(getByTestId(customTestID)).toBeTruthy();
  });

  it('shows "High to Low" text when direction is desc', () => {
    // Arrange & Act
    const { getByText } = render(
      <PerpsMarketSortFilters {...defaultProps} direction="desc" />,
    );

    // Assert
    expect(getByText('High to Low')).toBeTruthy();
  });

  it('shows "Low to High" text when direction is asc', () => {
    // Arrange & Act
    const { getByText } = render(
      <PerpsMarketSortFilters {...defaultProps} direction="asc" />,
    );

    // Assert
    expect(getByText('Low to High')).toBeTruthy();
  });

  it('renders direction toggle with correct testID', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <PerpsMarketSortFilters {...defaultProps} />,
    );

    // Assert
    expect(
      getByTestId('perps-market-sort-filters-direction-toggle'),
    ).toBeTruthy();
  });

  it('allows pressing different sort chips', () => {
    // Arrange
    const { getByTestId } = render(
      <PerpsMarketSortFilters {...defaultProps} />,
    );

    // Act
    fireEvent.press(getByTestId('perps-market-sort-filters-chip-volume'));
    fireEvent.press(getByTestId('perps-market-sort-filters-chip-priceChange'));
    fireEvent.press(getByTestId('perps-market-sort-filters-chip-fundingRate'));

    // Assert
    expect(mockOnSortChange).toHaveBeenCalledTimes(3);
    expect(mockOnSortChange).toHaveBeenNthCalledWith(1, 'volume');
    expect(mockOnSortChange).toHaveBeenNthCalledWith(2, 'priceChange');
    expect(mockOnSortChange).toHaveBeenNthCalledWith(3, 'fundingRate');
  });

  it('renders component with all interactive elements', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <PerpsMarketSortFilters {...defaultProps} />,
    );

    // Assert - Verify all interactive elements are present
    expect(getByTestId('perps-market-sort-filters-chip-volume')).toBeTruthy();
    expect(
      getByTestId('perps-market-sort-filters-chip-priceChange'),
    ).toBeTruthy();
    expect(
      getByTestId('perps-market-sort-filters-chip-fundingRate'),
    ).toBeTruthy();
    expect(
      getByTestId('perps-market-sort-filters-direction-toggle'),
    ).toBeTruthy();
  });
});
