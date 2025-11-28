import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsSelectModifyActionView from './PerpsSelectModifyActionView';
import type { Position } from '../../controllers/types';

let mockRouteParams: { position?: Position } = {};
const mockGoBack = jest.fn();
const mockNavigateToOrder = jest.fn();
const mockNavigateToClosePosition = jest.fn();
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
    name: 'SELECT_MODIFY_ACTION',
  }),
}));

jest.mock('../../hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToOrder: mockNavigateToOrder,
    navigateToClosePosition: mockNavigateToClosePosition,
  }),
}));

// Mock the PerpsModifyActionSheet component
jest.mock(
  '../../components/PerpsModifyActionSheet',
  () =>
    function MockPerpsModifyActionSheet({
      onClose,
      onActionSelect,
      position,
    }: {
      onClose: () => void;
      onActionSelect: (action: string) => void;
      position?: Position;
    }) {
      const ReactModule = jest.requireActual('react');
      const { View, Text, TouchableOpacity } =
        jest.requireActual('react-native');
      return ReactModule.createElement(
        View,
        { testID: 'modify-action-sheet' },
        ReactModule.createElement(Text, null, 'Modify Position'),
        position &&
          ReactModule.createElement(
            Text,
            { testID: 'position-coin' },
            position.coin,
          ),
        ReactModule.createElement(
          TouchableOpacity,
          {
            onPress: () => onActionSelect('add_to_position'),
            testID: 'add-to-position',
          },
          ReactModule.createElement(Text, null, 'Add to Position'),
        ),
        ReactModule.createElement(
          TouchableOpacity,
          {
            onPress: () => onActionSelect('reduce_position'),
            testID: 'reduce-position',
          },
          ReactModule.createElement(Text, null, 'Reduce Position'),
        ),
        ReactModule.createElement(
          TouchableOpacity,
          {
            onPress: () => onActionSelect('flip_position'),
            testID: 'flip-position',
          },
          ReactModule.createElement(Text, null, 'Flip Position'),
        ),
        ReactModule.createElement(
          TouchableOpacity,
          { onPress: onClose, testID: 'close-button' },
          ReactModule.createElement(Text, null, 'Close'),
        ),
      );
    },
);

describe('PerpsSelectModifyActionView', () => {
  const mockLongPosition: Position = {
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

  const mockShortPosition: Position = {
    ...mockLongPosition,
    size: '-2.5',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { position: mockLongPosition };
  });

  afterEach(() => {
    mockRouteParams = {};
  });

  it('renders the modify action sheet', () => {
    render(<PerpsSelectModifyActionView />);

    expect(screen.getByTestId('modify-action-sheet')).toBeOnTheScreen();
  });

  it('renders add to position option', () => {
    render(<PerpsSelectModifyActionView />);

    expect(screen.getByText('Add to Position')).toBeOnTheScreen();
  });

  it('renders reduce position option', () => {
    render(<PerpsSelectModifyActionView />);

    expect(screen.getByText('Reduce Position')).toBeOnTheScreen();
  });

  it('renders flip position option', () => {
    render(<PerpsSelectModifyActionView />);

    expect(screen.getByText('Flip Position')).toBeOnTheScreen();
  });

  it('renders with position from props', () => {
    render(<PerpsSelectModifyActionView position={mockLongPosition} />);

    expect(screen.getByTestId('position-coin')).toBeOnTheScreen();
    expect(screen.getByText('ETH')).toBeOnTheScreen();
  });

  it('navigates to order with long direction when add_to_position is selected for long position', () => {
    render(<PerpsSelectModifyActionView position={mockLongPosition} />);

    fireEvent.press(screen.getByTestId('add-to-position'));

    expect(mockNavigateToOrder).toHaveBeenCalledWith({
      direction: 'long',
      asset: 'ETH',
      hideTPSL: true,
    });
  });

  it('navigates to order with short direction when add_to_position is selected for short position', () => {
    render(<PerpsSelectModifyActionView position={mockShortPosition} />);

    fireEvent.press(screen.getByTestId('add-to-position'));

    expect(mockNavigateToOrder).toHaveBeenCalledWith({
      direction: 'short',
      asset: 'ETH',
      hideTPSL: true,
    });
  });

  it('navigates to close position when reduce_position is selected', () => {
    render(<PerpsSelectModifyActionView position={mockLongPosition} />);

    fireEvent.press(screen.getByTestId('reduce-position'));

    expect(mockNavigateToClosePosition).toHaveBeenCalledWith(mockLongPosition);
  });

  it('calls onReversePosition when flip_position is selected with callback', () => {
    const mockOnReversePosition = jest.fn();
    render(
      <PerpsSelectModifyActionView
        position={mockLongPosition}
        onReversePosition={mockOnReversePosition}
      />,
    );

    fireEvent.press(screen.getByTestId('flip-position'));

    expect(mockOnReversePosition).toHaveBeenCalledWith(mockLongPosition);
  });

  it('navigates to order with opposite direction when flip_position is selected without callback (long)', () => {
    render(<PerpsSelectModifyActionView position={mockLongPosition} />);

    fireEvent.press(screen.getByTestId('flip-position'));

    expect(mockNavigateToOrder).toHaveBeenCalledWith({
      direction: 'short',
      asset: 'ETH',
      amount: '2.5',
      leverage: 10,
    });
  });

  it('navigates to order with opposite direction when flip_position is selected without callback (short)', () => {
    render(<PerpsSelectModifyActionView position={mockShortPosition} />);

    fireEvent.press(screen.getByTestId('flip-position'));

    expect(mockNavigateToOrder).toHaveBeenCalledWith({
      direction: 'long',
      asset: 'ETH',
      amount: '2.5',
      leverage: 10,
    });
  });

  it('does not navigate when position is not available', () => {
    mockRouteParams = {};
    render(<PerpsSelectModifyActionView />);

    fireEvent.press(screen.getByTestId('add-to-position'));

    expect(mockNavigateToOrder).not.toHaveBeenCalled();
  });

  it('calls goBack when close button is pressed without external sheetRef', () => {
    render(<PerpsSelectModifyActionView position={mockLongPosition} />);

    fireEvent.press(screen.getByTestId('close-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls onClose callback when close button is pressed with external sheetRef', () => {
    const mockOnClose = jest.fn();
    const mockSheetRef = {
      current: { onCloseBottomSheet: mockOnCloseBottomSheet },
    };

    render(
      <PerpsSelectModifyActionView
        position={mockLongPosition}
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
    mockRouteParams = { position: mockLongPosition };
    render(<PerpsSelectModifyActionView />);

    fireEvent.press(screen.getByTestId('add-to-position'));

    expect(mockNavigateToOrder).toHaveBeenCalledWith({
      direction: 'long',
      asset: 'ETH',
      hideTPSL: true,
    });
  });
});
