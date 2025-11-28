import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsSelectAdjustMarginActionView from './PerpsSelectAdjustMarginActionView';
import type { Position } from '../../controllers/types';

let mockRouteParams: { position?: Position } = {};
const mockGoBack = jest.fn();
const mockNavigateToAdjustMargin = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
    key: 'test-route',
    name: 'SELECT_ADJUST_MARGIN_ACTION',
  }),
}));

jest.mock('../../hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToAdjustMargin: mockNavigateToAdjustMargin,
  }),
}));

// Mock the PerpsAdjustMarginActionSheet component
jest.mock(
  '../../components/PerpsAdjustMarginActionSheet',
  () =>
    function MockPerpsAdjustMarginActionSheet({
      onClose,
      onSelectAction,
    }: {
      onClose: () => void;
      onSelectAction: (action: string) => void;
    }) {
      const ReactModule = jest.requireActual('react');
      const { View, Text, TouchableOpacity } =
        jest.requireActual('react-native');
      return ReactModule.createElement(
        View,
        { testID: 'adjust-margin-action-sheet' },
        ReactModule.createElement(Text, null, 'Adjust Margin Action Sheet'),
        ReactModule.createElement(
          TouchableOpacity,
          { onPress: () => onSelectAction('add_margin'), testID: 'add-margin' },
          ReactModule.createElement(Text, null, 'Add Margin'),
        ),
        ReactModule.createElement(
          TouchableOpacity,
          {
            onPress: () => onSelectAction('reduce_margin'),
            testID: 'reduce-margin',
          },
          ReactModule.createElement(Text, null, 'Reduce Margin'),
        ),
        ReactModule.createElement(
          TouchableOpacity,
          { onPress: onClose, testID: 'close-button' },
          ReactModule.createElement(Text, null, 'Close'),
        ),
      );
    },
);

describe('PerpsSelectAdjustMarginActionView', () => {
  const mockPosition: Position = {
    coin: 'ETH',
    size: '2.5',
    marginUsed: '500',
    entryPrice: '2000',
    liquidationPrice: '1900',
    unrealizedPnl: '100',
    returnOnEquity: '0.20',
    leverage: { value: 10, type: 'isolated' },
    cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
    positionValue: '5000',
    maxLeverage: 50,
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { position: mockPosition };
  });

  afterEach(() => {
    mockRouteParams = {};
  });

  it('renders the adjust margin action sheet', () => {
    render(<PerpsSelectAdjustMarginActionView />);

    expect(screen.getByTestId('adjust-margin-action-sheet')).toBeOnTheScreen();
  });

  it('renders add margin option', () => {
    render(<PerpsSelectAdjustMarginActionView />);

    expect(screen.getByText('Add Margin')).toBeOnTheScreen();
  });

  it('renders reduce margin option', () => {
    render(<PerpsSelectAdjustMarginActionView />);

    expect(screen.getByText('Reduce Margin')).toBeOnTheScreen();
  });

  it('renders with position from props', () => {
    render(<PerpsSelectAdjustMarginActionView position={mockPosition} />);

    expect(screen.getByTestId('adjust-margin-action-sheet')).toBeOnTheScreen();
  });

  it('navigates to add margin when add_margin action is selected', () => {
    render(<PerpsSelectAdjustMarginActionView position={mockPosition} />);

    fireEvent.press(screen.getByTestId('add-margin'));

    expect(mockNavigateToAdjustMargin).toHaveBeenCalledWith(
      mockPosition,
      'add',
    );
  });

  it('navigates to reduce margin when reduce_margin action is selected', () => {
    render(<PerpsSelectAdjustMarginActionView position={mockPosition} />);

    fireEvent.press(screen.getByTestId('reduce-margin'));

    expect(mockNavigateToAdjustMargin).toHaveBeenCalledWith(
      mockPosition,
      'remove',
    );
  });

  it('does not navigate when position is not available', () => {
    mockRouteParams = {};
    render(<PerpsSelectAdjustMarginActionView />);

    fireEvent.press(screen.getByTestId('add-margin'));

    expect(mockNavigateToAdjustMargin).not.toHaveBeenCalled();
  });

  it('calls goBack when close button is pressed without external sheetRef', () => {
    render(<PerpsSelectAdjustMarginActionView position={mockPosition} />);

    fireEvent.press(screen.getByTestId('close-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls onClose callback when close button is pressed with external sheetRef', () => {
    const mockOnClose = jest.fn();
    const mockSheetRef = {
      current: { onCloseBottomSheet: mockOnCloseBottomSheet },
    };

    render(
      <PerpsSelectAdjustMarginActionView
        position={mockPosition}
        sheetRef={mockSheetRef as never}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByTestId('close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('uses position from route params when not provided via props', () => {
    mockRouteParams = { position: mockPosition };
    render(<PerpsSelectAdjustMarginActionView />);

    fireEvent.press(screen.getByTestId('add-margin'));

    expect(mockNavigateToAdjustMargin).toHaveBeenCalledWith(
      mockPosition,
      'add',
    );
  });
});
