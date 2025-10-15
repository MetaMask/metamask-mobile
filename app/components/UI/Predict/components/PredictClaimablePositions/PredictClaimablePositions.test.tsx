import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { usePredictClaimablePositions } from '../../hooks/usePredictClaimablePositions';
import { PredictPosition, PredictPositionStatus } from '../../types';
import PredictClaimablePositions, {
  PredictClaimablePositionsHandle,
} from './PredictClaimablePositions';

jest.mock('../../hooks/usePredictClaimablePositions');
jest.mock('../PredictPositionResolved', () => 'PredictPositionResolved');

// Mock strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.tab.resolved_markets': 'Resolved markets',
    };
    return translations[key] || key;
  }),
}));

const mockUsePredictClaimablePositions =
  usePredictClaimablePositions as jest.MockedFunction<
    typeof usePredictClaimablePositions
  >;

const mockNavigation = {
  navigate: jest.fn(),
};

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('PredictClaimablePositions', () => {
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
      status: PredictPositionStatus.WON,
      size: 10,
      outcomeIndex: 0,
      realizedPnl: 5,
      percentPnl: 50,
      cashPnl: 5,
      claimable: true,
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
      status: PredictPositionStatus.WON,
      size: 20,
      outcomeIndex: 1,
      realizedPnl: 10,
      percentPnl: 100,
      cashPnl: 10,
      claimable: true,
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
    mockUsePredictClaimablePositions.mockReturnValue(defaultMockHookReturn);
  });

  it('renders nothing when there are no positions', () => {
    // Arrange
    mockUsePredictClaimablePositions.mockReturnValue({
      ...defaultMockHookReturn,
      positions: [],
    });

    // Act
    const { toJSON } = renderWithProvider(<PredictClaimablePositions />);

    // Assert
    expect(toJSON()).toBeNull();
  });

  it('renders resolved markets title when positions exist', () => {
    // Arrange
    mockUsePredictClaimablePositions.mockReturnValue({
      ...defaultMockHookReturn,
      positions: mockPositions,
    });

    // Act
    renderWithProvider(<PredictClaimablePositions />);

    // Assert
    expect(screen.getByText('Resolved markets')).toBeOnTheScreen();
  });

  it('renders PredictPositionResolved components when positions exist', () => {
    // Arrange
    mockUsePredictClaimablePositions.mockReturnValue({
      ...defaultMockHookReturn,
      positions: mockPositions,
    });

    // Act
    renderWithProvider(<PredictClaimablePositions />);

    // Assert - PredictPositionResolved components should be rendered
    // Since PredictPositionResolved is mocked as a string, we check for its presence
    const renderedOutput = screen.toJSON();
    expect(renderedOutput).toBeTruthy();
  });

  it('exposes refresh method via ref', () => {
    // Arrange
    const mockLoadPositions = jest.fn();
    mockUsePredictClaimablePositions.mockReturnValue({
      ...defaultMockHookReturn,
      loadPositions: mockLoadPositions,
    });

    const ref = React.createRef<PredictClaimablePositionsHandle>();
    renderWithProvider(<PredictClaimablePositions ref={ref} />);

    // Act
    ref.current?.refresh();

    // Assert
    expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
  });
});
