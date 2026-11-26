import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CryptoTokensSortBottomSheet from './CryptoTokensSortBottomSheet';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('CryptoTokensSortBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();

  const renderSheet = (
    sort?: React.ComponentProps<typeof CryptoTokensSortBottomSheet>['sort'],
  ) =>
    render(
      <CryptoTokensSortBottomSheet
        sort={sort}
        onApply={mockOnApply}
        onClose={mockOnClose}
        testID="sheet"
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists price change, volume and market cap', () => {
    renderSheet();

    expect(screen.getByText('perps.sort.price_change')).toBeOnTheScreen();
    expect(screen.getByText('perps.sort.volume')).toBeOnTheScreen();
    expect(screen.getByText('trending.market_cap')).toBeOnTheScreen();
  });

  it('applies a newly picked option high to low', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId('sheet-option-volume'));
    fireEvent.press(screen.getByTestId('sheet-apply'));

    expect(mockOnApply).toHaveBeenCalledWith({
      option: PriceChangeOption.Volume,
      direction: SortDirection.Descending,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('toggles to low to high when the selected option is tapped again', () => {
    renderSheet({
      option: PriceChangeOption.MarketCap,
      direction: SortDirection.Descending,
    });

    fireEvent.press(screen.getByTestId('sheet-option-market_cap'));

    expect(screen.getByTestId('sheet-direction-text')).toHaveTextContent(
      'perps.sort.low_to_high',
    );
    fireEvent.press(screen.getByTestId('sheet-apply'));
    expect(mockOnApply).toHaveBeenCalledWith({
      option: PriceChangeOption.MarketCap,
      direction: SortDirection.Ascending,
    });
  });

  it('applies no sort after Reset', () => {
    renderSheet({
      option: PriceChangeOption.Volume,
      direction: SortDirection.Ascending,
    });

    fireEvent.press(screen.getByTestId('sheet-reset'));
    fireEvent.press(screen.getByTestId('sheet-apply'));

    expect(mockOnApply).toHaveBeenCalledWith(undefined);
  });
});
