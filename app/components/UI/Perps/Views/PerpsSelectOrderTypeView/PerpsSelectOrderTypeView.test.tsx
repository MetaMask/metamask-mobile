import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsSelectOrderTypeView from './PerpsSelectOrderTypeView';

const mockGoBack = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

// Mock the PerpsOrderTypeBottomSheet component
jest.mock(
  '../../components/PerpsOrderTypeBottomSheet',
  () =>
    function MockPerpsOrderTypeBottomSheet({
      onClose,
      onSelect,
      currentOrderType,
      asset,
      direction,
    }: {
      onClose: () => void;
      onSelect: (type: string) => void;
      currentOrderType: string;
      asset?: string;
      direction?: string;
    }) {
      const ReactModule = jest.requireActual('react');
      const { View, Text, TouchableOpacity } =
        jest.requireActual('react-native');
      return ReactModule.createElement(
        View,
        { testID: 'order-type-bottom-sheet' },
        ReactModule.createElement(Text, null, 'Select Order Type'),
        ReactModule.createElement(
          Text,
          { testID: 'current-type' },
          `Current: ${currentOrderType}`,
        ),
        asset &&
          ReactModule.createElement(
            Text,
            { testID: 'asset' },
            `Asset: ${asset}`,
          ),
        direction &&
          ReactModule.createElement(
            Text,
            { testID: 'direction' },
            `Direction: ${direction}`,
          ),
        ReactModule.createElement(
          TouchableOpacity,
          { onPress: () => onSelect('market'), testID: 'select-market' },
          ReactModule.createElement(Text, null, 'Market'),
        ),
        ReactModule.createElement(
          TouchableOpacity,
          { onPress: () => onSelect('limit'), testID: 'select-limit' },
          ReactModule.createElement(Text, null, 'Limit'),
        ),
        ReactModule.createElement(
          TouchableOpacity,
          { onPress: onClose, testID: 'close-button' },
          ReactModule.createElement(Text, null, 'Close'),
        ),
      );
    },
);

describe('PerpsSelectOrderTypeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the order type bottom sheet', () => {
    render(<PerpsSelectOrderTypeView />);

    expect(screen.getByTestId('order-type-bottom-sheet')).toBeOnTheScreen();
  });

  it('renders with default market order type', () => {
    render(<PerpsSelectOrderTypeView />);

    expect(screen.getByText('Current: market')).toBeOnTheScreen();
  });

  it('renders with custom order type', () => {
    render(<PerpsSelectOrderTypeView currentOrderType="limit" />);

    expect(screen.getByText('Current: limit')).toBeOnTheScreen();
  });

  it('renders market option', () => {
    render(<PerpsSelectOrderTypeView />);

    expect(screen.getByText('Market')).toBeOnTheScreen();
  });

  it('renders limit option', () => {
    render(<PerpsSelectOrderTypeView />);

    expect(screen.getByText('Limit')).toBeOnTheScreen();
  });

  it('displays asset when provided', () => {
    render(<PerpsSelectOrderTypeView asset="BTC" />);

    expect(screen.getByText('Asset: BTC')).toBeOnTheScreen();
  });

  it('displays direction when provided', () => {
    render(<PerpsSelectOrderTypeView direction="long" />);

    expect(screen.getByText('Direction: long')).toBeOnTheScreen();
  });

  it('calls onSelect callback when order type is selected', () => {
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();
    const mockSheetRef = {
      current: { onCloseBottomSheet: mockOnCloseBottomSheet },
    };

    render(
      <PerpsSelectOrderTypeView
        sheetRef={mockSheetRef as never}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByTestId('select-market'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSelect).toHaveBeenCalledWith('market');
  });

  it('calls onSelect with limit when limit is selected', () => {
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();
    const mockSheetRef = {
      current: { onCloseBottomSheet: mockOnCloseBottomSheet },
    };

    render(
      <PerpsSelectOrderTypeView
        sheetRef={mockSheetRef as never}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByTestId('select-limit'));

    expect(mockOnSelect).toHaveBeenCalledWith('limit');
  });

  it('calls goBack when close button is pressed without external sheetRef', () => {
    render(<PerpsSelectOrderTypeView />);

    fireEvent.press(screen.getByTestId('close-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls onClose callback when close button is pressed with external sheetRef', () => {
    const mockOnClose = jest.fn();
    const mockSheetRef = {
      current: { onCloseBottomSheet: mockOnCloseBottomSheet },
    };

    render(
      <PerpsSelectOrderTypeView
        sheetRef={mockSheetRef as never}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByTestId('close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
