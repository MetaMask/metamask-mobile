import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictPosition, PredictPositionStatus } from '../../types';
import PredictPositions, { PredictPositionsHandle } from './PredictPositions';

jest.mock('../../hooks/usePredictPositions');
jest.mock('../PredictPosition/PredictPosition', () => 'PredictPosition');
jest.mock('../PredictPositionEmpty', () => 'PredictPositionEmpty');
jest.mock('../PredictNewButton', () => 'PredictNewButton');

const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
  typeof usePredictPositions
>;

const mockNavigation = {
  navigate: jest.fn(),
};

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('PredictPositions', () => {
  const mockPositions: PredictPosition[] = [
    {
      id: '1',
      providerId: 'provider1',
      marketId: 'market1',
      outcomeId: 'outcome1',
      outcome: 'Yes',
      outcomeTokenId: 'token1',
      currentValue: 100,
      title: 'Test Market 1',
      icon: 'icon1',
      amount: 10,
      price: 1.5,
      status: PredictPositionStatus.OPEN,
      size: 10,
      outcomeIndex: 0,
      realizedPnl: 5,
      percentPnl: 50,
      cashPnl: 5,
      claimable: false,
      initialValue: 10,
      avgPrice: 1.0,
      endDate: '2024-01-01T00:00:00Z',
      negRisk: false,
    },
    {
      id: '2',
      providerId: 'provider1',
      marketId: 'market2',
      outcomeId: 'outcome2',
      outcome: 'No',
      outcomeTokenId: 'token2',
      currentValue: 200,
      title: 'Test Market 2',
      icon: 'icon2',
      amount: 20,
      price: 2.0,
      status: PredictPositionStatus.OPEN,
      size: 20,
      outcomeIndex: 1,
      realizedPnl: 10,
      percentPnl: 25,
      cashPnl: 10,
      claimable: false,
      initialValue: 20,
      avgPrice: 1.0,
      endDate: '2024-01-02T00:00:00Z',
      negRisk: false,
    },
  ];

  const defaultMockHookReturn = {
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPositions.mockReturnValue(defaultMockHookReturn);
  });

  it('renders loading state when isLoading is true', () => {
    // Arrange
    mockUsePredictPositions.mockReturnValue({
      ...defaultMockHookReturn,
      isLoading: true,
      positions: [],
    });

    // Act
    renderWithProvider(<PredictPositions />);

    // Assert
    expect(screen.getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('renders loading state when isRefreshing and no positions', () => {
    // Arrange
    mockUsePredictPositions.mockReturnValue({
      ...defaultMockHookReturn,
      isRefreshing: true,
      positions: [],
    });

    // Act
    renderWithProvider(<PredictPositions />);

    // Assert
    expect(screen.getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('renders FlashList when no positions and not loading', () => {
    // Arrange
    mockUsePredictPositions.mockReturnValue({
      ...defaultMockHookReturn,
      positions: [],
    });

    // Act
    renderWithProvider(<PredictPositions />);

    // Assert - FlashList should be rendered
    expect(
      screen.getByTestId('predict-active-positions-list'),
    ).toBeOnTheScreen();
    // Claimable list should not be rendered when there are no claimable positions
    expect(
      screen.queryByTestId('predict-claimable-positions-list'),
    ).not.toBeOnTheScreen();
  });

  it('renders FlashList when positions exist', () => {
    // Arrange - mock the hook to return different values for each call
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: mockPositions,
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [],
      });

    // Act
    renderWithProvider(<PredictPositions />);

    // Assert
    expect(
      screen.getByTestId('predict-active-positions-list'),
    ).toBeOnTheScreen();
    // Claimable list should not be rendered when there are no claimable positions
    expect(
      screen.queryByTestId('predict-claimable-positions-list'),
    ).not.toBeOnTheScreen();
  });

  it('renders claimable positions list when claimable positions exist', () => {
    // Arrange - mock the hook to return different values for each call
    const claimablePosition: PredictPosition = {
      ...mockPositions[0],
      id: '3',
      claimable: true,
      status: PredictPositionStatus.REDEEMABLE,
    };

    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: mockPositions,
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [claimablePosition],
      });

    // Act
    renderWithProvider(<PredictPositions />);

    // Assert
    expect(
      screen.getByTestId('predict-active-positions-list'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-claimable-positions-list'),
    ).toBeOnTheScreen();
  });

  it('exposes refresh method via ref', () => {
    // Arrange
    const mockLoadPositions = jest.fn();
    const mockLoadClaimablePositions = jest.fn();

    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        loadPositions: mockLoadPositions,
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        loadPositions: mockLoadClaimablePositions,
      });

    const ref = React.createRef<PredictPositionsHandle>();
    renderWithProvider(<PredictPositions ref={ref} />);

    // Act
    ref.current?.refresh();

    // Assert
    expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
    expect(mockLoadClaimablePositions).toHaveBeenCalledWith({
      isRefresh: true,
    });
  });
});
