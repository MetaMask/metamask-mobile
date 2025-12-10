import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TrendingTokenPriceChangeBottomSheet,
  PriceChangeOption,
  SortDirection,
} from './TrendingTokenPriceChangeBottomSheet';

const mockOnCloseBottomSheet = jest.fn();
const mockOnOpenBottomSheet = jest.fn();

let storedOnClose: (() => void) | undefined;

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');

    const MockBottomSheet = forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          onClose?: () => void;
        },
        ref: React.Ref<{
          onOpenBottomSheet: (cb?: () => void) => void;
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        storedOnClose = onClose;
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (cb?: () => void) => {
            mockOnOpenBottomSheet();
            cb?.();
          },
          onCloseBottomSheet: (cb?: () => void) => {
            mockOnCloseBottomSheet();
            cb?.();
          },
        }));

        return <View testID="bottom-sheet">{children}</View>;
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { TouchableOpacity, View } = jest.requireActual('react-native');
    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        <TouchableOpacity testID="close-button" onPress={onClose}>
          Close
        </TouchableOpacity>
        {children}
      </View>
    );
  },
);

jest.mock(
  '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase',
  () => {
    const { TouchableOpacity, View } = jest.requireActual('react-native');
    return ({
      children,
      onPress,
      label,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      label?: React.ReactNode;
    }) => (
      <TouchableOpacity testID="apply-button" onPress={onPress}>
        <View>{label || children}</View>
      </TouchableOpacity>
    );
  },
);

describe('TrendingTokenPriceChangeBottomSheet', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    storedOnClose = undefined;
    mockOnClose.mockClear();
    mockOnOpenBottomSheet.mockClear();
  });

  it('renders with default "Price change" selected', () => {
    const { getByText } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(getByText('Sort by')).toBeOnTheScreen();
    expect(getByText('Price change')).toBeOnTheScreen();
    expect(getByText('High to low')).toBeOnTheScreen();
  });

  it('renders all sort options', () => {
    const { getByText } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(getByText('Price change')).toBeOnTheScreen();
    expect(getByText('Volume')).toBeOnTheScreen();
    expect(getByText('Market cap')).toBeOnTheScreen();
  });

  it('renders Apply button', () => {
    const { getByTestId, getByText } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(getByTestId('apply-button')).toBeOnTheScreen();
    expect(getByText('Apply')).toBeOnTheScreen();
  });

  it('displays "High to low" and down arrow for descending sort', () => {
    const { getByText } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(getByText('High to low')).toBeOnTheScreen();
  });

  it('toggles sort direction when same option is pressed', () => {
    const { getByText, queryByText } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    const priceChangeOption = getByText('Price change');
    expect(getByText('High to low')).toBeOnTheScreen();

    const parent = priceChangeOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(getByText('Low to high')).toBeOnTheScreen();
    expect(queryByText('High to low')).toBeNull();
  });

  it('selects new option with descending direction when different option is pressed', () => {
    const { getByText } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    const volumeOption = getByText('Volume');
    const parent = volumeOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(getByText('Volume')).toBeOnTheScreen();
    expect(getByText('High to low')).toBeOnTheScreen();
  });

  it('calls onPriceChangeSelect with correct values when Apply is pressed', () => {
    const mockOnPriceChangeSelect = jest.fn();

    const { getByTestId } = render(
      <TrendingTokenPriceChangeBottomSheet
        isVisible
        onClose={mockOnClose}
        onPriceChangeSelect={mockOnPriceChangeSelect}
      />,
    );

    const applyButton = getByTestId('apply-button');
    fireEvent.press(applyButton);

    expect(mockOnPriceChangeSelect).toHaveBeenCalledWith(
      PriceChangeOption.PriceChange,
      SortDirection.Descending,
    );
  });

  it('calls onPriceChangeSelect with updated sort direction after toggle', () => {
    const mockOnPriceChangeSelect = jest.fn();

    const { getByText, getByTestId } = render(
      <TrendingTokenPriceChangeBottomSheet
        isVisible
        onClose={mockOnClose}
        onPriceChangeSelect={mockOnPriceChangeSelect}
      />,
    );

    const priceChangeOption = getByText('Price change');
    const parent = priceChangeOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    const applyButton = getByTestId('apply-button');
    fireEvent.press(applyButton);

    expect(mockOnPriceChangeSelect).toHaveBeenCalledWith(
      PriceChangeOption.PriceChange,
      SortDirection.Ascending,
    );
  });

  it('closes bottom sheet when Apply is pressed', () => {
    const mockOnPriceChangeSelect = jest.fn();

    const { getByTestId } = render(
      <TrendingTokenPriceChangeBottomSheet
        isVisible
        onClose={mockOnClose}
        onPriceChangeSelect={mockOnPriceChangeSelect}
      />,
    );

    const applyButton = getByTestId('apply-button');
    fireEvent.press(applyButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when sheet is closed via onClose callback', () => {
    render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    if (storedOnClose) {
      storedOnClose();
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when isVisible is false', () => {
    const { queryByTestId } = render(
      <TrendingTokenPriceChangeBottomSheet
        isVisible={false}
        onClose={mockOnClose}
      />,
    );

    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('uses selectedOption and sortDirection props when provided', () => {
    const { getByText } = render(
      <TrendingTokenPriceChangeBottomSheet
        isVisible
        onClose={mockOnClose}
        selectedOption={PriceChangeOption.Volume}
        sortDirection={SortDirection.Ascending}
      />,
    );

    expect(getByText('Volume')).toBeOnTheScreen();
    expect(getByText('Low to high')).toBeOnTheScreen();
  });

  it('calls onOpenBottomSheet when isVisible becomes true', () => {
    const { rerender } = render(
      <TrendingTokenPriceChangeBottomSheet
        isVisible={false}
        onClose={mockOnClose}
      />,
    );

    expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();

    rerender(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(mockOnOpenBottomSheet).toHaveBeenCalled();
  });
  it('selects MarketCap option when pressed', () => {
    const { getByText } = render(
      <TrendingTokenPriceChangeBottomSheet isVisible onClose={mockOnClose} />,
    );
    const marketCapOption = getByText('Market cap');
    const parent = marketCapOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);
    expect(getByText('Market cap')).toBeOnTheScreen();
    expect(getByText('High to low')).toBeOnTheScreen();
  });
});
