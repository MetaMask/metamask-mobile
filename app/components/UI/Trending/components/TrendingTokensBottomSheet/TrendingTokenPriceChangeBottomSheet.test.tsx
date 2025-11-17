import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TrendingTokenPriceChangeBottomSheet,
  PriceChangeOption,
  SortDirection,
} from './TrendingTokenPriceChangeBottomSheet';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

const mockUseParams = jest.fn();
jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

let storedOnClose: (() => void) | undefined;

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
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
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        storedOnClose = onClose;
        useImperativeHandle(ref, () => ({
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
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
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
  '../../../../component-library/components/Buttons/Button/foundation/ButtonBase',
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
  beforeEach(() => {
    jest.clearAllMocks();
    storedOnClose = undefined;
    mockUseParams.mockReturnValue({});
  });

  it('renders with default "Price change" selected', () => {
    const { getByText } = render(<TrendingTokenPriceChangeBottomSheet />);

    expect(getByText('Sort by')).toBeTruthy();
    expect(getByText('Price change')).toBeTruthy();
    expect(getByText('High to low')).toBeTruthy();
  });

  it('renders all sort options', () => {
    const { getByText } = render(<TrendingTokenPriceChangeBottomSheet />);

    expect(getByText('Price change')).toBeTruthy();
    expect(getByText('Volume')).toBeTruthy();
    expect(getByText('Market cap')).toBeTruthy();
  });

  it('renders Apply button', () => {
    const { getByTestId, getByText } = render(
      <TrendingTokenPriceChangeBottomSheet />,
    );

    expect(getByTestId('apply-button')).toBeTruthy();
    expect(getByText('Apply')).toBeTruthy();
  });

  it('displays "High to low" and down arrow for descending sort', () => {
    const { getByText } = render(<TrendingTokenPriceChangeBottomSheet />);

    expect(getByText('High to low')).toBeTruthy();
  });

  it('toggles sort direction when same option is pressed', () => {
    const { getByText, queryByText } = render(
      <TrendingTokenPriceChangeBottomSheet />,
    );

    const priceChangeOption = getByText('Price change');
    expect(getByText('High to low')).toBeTruthy();

    const parent = priceChangeOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(getByText('Low to high')).toBeTruthy();
    expect(queryByText('High to low')).toBeNull();
  });

  it('selects new option with descending direction when different option is pressed', () => {
    const { getByText } = render(<TrendingTokenPriceChangeBottomSheet />);

    const volumeOption = getByText('Volume');
    const parent = volumeOption.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(getByText('Volume')).toBeTruthy();
    expect(getByText('High to low')).toBeTruthy();
  });

  it('calls onPriceChangeSelect with correct values when Apply is pressed', () => {
    const mockOnPriceChangeSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onPriceChangeSelect: mockOnPriceChangeSelect,
    });

    const { getByTestId } = render(<TrendingTokenPriceChangeBottomSheet />);

    const applyButton = getByTestId('apply-button');
    fireEvent.press(applyButton);

    expect(mockOnPriceChangeSelect).toHaveBeenCalledWith(
      PriceChangeOption.PriceChange,
      SortDirection.Descending,
    );
  });

  it('calls onPriceChangeSelect with updated sort direction after toggle', () => {
    const mockOnPriceChangeSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onPriceChangeSelect: mockOnPriceChangeSelect,
    });

    const { getByText, getByTestId } = render(
      <TrendingTokenPriceChangeBottomSheet />,
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
    mockUseParams.mockReturnValue({
      onPriceChangeSelect: mockOnPriceChangeSelect,
    });

    const { getByTestId } = render(<TrendingTokenPriceChangeBottomSheet />);

    const applyButton = getByTestId('apply-button');
    fireEvent.press(applyButton);

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('navigates back when close button is pressed', () => {
    const { getByTestId } = render(<TrendingTokenPriceChangeBottomSheet />);

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('navigates back when sheet is closed via onClose', () => {
    render(<TrendingTokenPriceChangeBottomSheet />);

    if (storedOnClose) {
      storedOnClose();
    }

    expect(mockGoBack).toHaveBeenCalled();
  });
});
