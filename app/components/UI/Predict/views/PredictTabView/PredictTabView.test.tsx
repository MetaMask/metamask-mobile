import { useNavigation } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);
const store = mockStore({
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x123',
      },
    },
  },
});

const renderWithProviders = (component: React.ReactElement) =>
  render(<Provider store={store}>{component}</Provider>);

// Mock Alert
const mockAlert = jest.fn();
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: mockAlert,
    },
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
  useFocusEffect: jest.fn(),
}));

// Mock hooks with more flexibility
const mockUsePredictPositions = jest.fn();
const mockUsePredictClaim = jest.fn();

jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: (options?: { claimable?: boolean }) =>
    mockUsePredictPositions(options),
}));

jest.mock('../../hooks/usePredictClaim', () => ({
  usePredictClaim: () => mockUsePredictClaim(),
}));

jest.mock('../../hooks/usePredictNotifications', () => ({
  usePredictNotifications: jest.fn(() => ({})),
}));

// Mock components
jest.mock('../../components/MarketsWonCard', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockMarketsWonCard({
      onClaimPress,
      numberOfMarketsWon,
      totalClaimableAmount,
    }: {
      onClaimPress: () => void;
      numberOfMarketsWon: number;
      totalClaimableAmount: number;
    }) {
      return (
        <TouchableOpacity testID="markets-won-card" onPress={onClaimPress}>
          <Text testID="markets-won-count">{numberOfMarketsWon}</Text>
          <Text testID="claimable-amount">{totalClaimableAmount}</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock('../../components/PredictPosition', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockPredictPosition({
      position,
      onPress,
    }: {
      position: { id: string; title: string };
      onPress: () => void;
    }) {
      return (
        <TouchableOpacity testID={`position-${position.id}`} onPress={onPress}>
          <Text>{position.title}</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock('../../components/PredictNewButton', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockPredictNewButton() {
      return (
        <View testID="predict-new-button">
          <Text>New Prediction</Text>
        </View>
      );
    },
  };
});

jest.mock('../../components/PredictPositionEmpty', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockPredictPositionEmpty() {
      return (
        <View testID="predict-position-empty">
          <View testID="mock-icon" />
          <Text>predict.tab.no_predictions</Text>
          <Text>predict.tab.no_predictions_description</Text>
          <TouchableOpacity testID="explore-button">
            <Text>predict.tab.explore</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

jest.mock(
  '../../../../../component-library/components/Skeleton/Skeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: function MockSkeleton({ testID }: { testID?: string }) {
        return <View testID={testID} />;
      },
    };
  },
);

// Mock Routes
jest.mock('../../../../../constants/navigation/Routes', () => ({
  PREDICT: {
    ROOT: 'Predict',
    MARKET_DETAILS: 'PredictMarketDetails',
    MODALS: {
      ROOT: 'PredictModals',
    },
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: View,
    Text,
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
    TextColor: {
      ErrorDefault: 'ErrorDefault',
    },
  };
});

jest.mock('@shopify/flash-list', () => {
  const { View, ScrollView } = jest.requireActual('react-native');
  return {
    FlashList: ({
      ListEmptyComponent,
      ListHeaderComponent,
      ListFooterComponent,
      data,
      renderItem,
      refreshControl,
    }: {
      ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
      ListHeaderComponent?: React.ReactNode | (() => React.ReactNode);
      ListFooterComponent?: React.ReactNode | (() => React.ReactNode);
      data?: unknown[];
      renderItem?: (info: { item: unknown }) => React.ReactNode;
      refreshControl?: React.ReactNode;
    }) => {
      const isEmpty = !data || data.length === 0;

      return (
        <ScrollView testID="flash-list" refreshControl={refreshControl}>
          {ListHeaderComponent && (
            <View testID="list-header">
              {typeof ListHeaderComponent === 'function'
                ? ListHeaderComponent()
                : ListHeaderComponent}
            </View>
          )}
          {isEmpty && ListEmptyComponent && (
            <View testID="empty-state">
              {typeof ListEmptyComponent === 'function'
                ? ListEmptyComponent()
                : ListEmptyComponent}
            </View>
          )}
          {!isEmpty &&
            data.map((item: unknown, index: number) => (
              <View key={index} testID={`list-item-${index}`}>
                {renderItem?.({ item })}
              </View>
            ))}
          {ListFooterComponent && (
            <View testID="list-footer">
              {typeof ListFooterComponent === 'function'
                ? ListFooterComponent()
                : ListFooterComponent}
            </View>
          )}
        </ScrollView>
      );
    },
  };
});

import PredictTabView from './PredictTabView';
import { PredictPositionStatus } from '../../types';

describe('PredictTabView', () => {
  const mockNavigate = jest.fn();
  const mockLoadPositions = jest.fn();
  const mockLoadClaimablePositions = jest.fn();
  const mockClaim = jest.fn();

  const mockPosition = {
    id: 'pos-1',
    outcomeId: 'outcome-1',
    outcomeIndex: 0,
    title: 'Test Position',
    cashPnl: 10,
    marketId: 'market-1',
  };

  const mockClaimablePosition = {
    id: 'claimable-1',
    outcomeId: 'claimable-outcome-1',
    outcomeIndex: 0,
    title: 'Claimable Position',
    cashPnl: 15,
    status: PredictPositionStatus.WON,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    // Mock usePredictPositions to handle both regular and claimable calls
    mockUsePredictPositions.mockImplementation(
      (options: { claimable?: boolean } = {}) => {
        if (options.claimable) {
          // Return claimable positions when claimable: true
          return {
            positions: [],
            isLoading: false,
            isRefreshing: false,
            error: null,
            loadPositions: mockLoadClaimablePositions,
          };
        }
        // Return regular positions when claimable is false or undefined
        return {
          positions: [],
          isLoading: false,
          isRefreshing: false,
          error: null,
          loadPositions: mockLoadPositions,
        };
      },
    );

    mockUsePredictClaim.mockReturnValue({
      claim: mockClaim,
      loading: false,
    });
  });

  describe('Loading States', () => {
    it('renders loading state when isLoading is true', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      renderWithProviders(<PredictTabView />);

      expect(screen.getAllByTestId(/skeleton-loading-/)).toHaveLength(5);
    });

    it('renders loading state when isRefreshing is true and positions is empty', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: true,
        error: null,
        loadPositions: mockLoadPositions,
      });

      renderWithProviders(<PredictTabView />);

      expect(screen.getAllByTestId(/skeleton-loading-/)).toHaveLength(5);
    });
  });

  describe('Error States', () => {
    it('renders error state when error exists', () => {
      const errorMessage = 'Failed to load positions';
      mockUsePredictPositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: errorMessage,
        loadPositions: mockLoadPositions,
      });

      renderWithProviders(<PredictTabView />);

      expect(screen.getByText(errorMessage)).toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when positions array is empty', () => {
      renderWithProviders(<PredictTabView />);

      expect(screen.getByTestId('empty-state')).toBeOnTheScreen();
    });

    it('displays correct empty state content', () => {
      renderWithProviders(<PredictTabView />);

      expect(screen.getByTestId('mock-icon')).toBeOnTheScreen();
      expect(screen.getByText('predict.tab.no_predictions')).toBeOnTheScreen();
      expect(
        screen.getByText('predict.tab.no_predictions_description'),
      ).toBeOnTheScreen();
      expect(screen.getByText('predict.tab.explore')).toBeOnTheScreen();
    });
  });

  describe('Positions List', () => {
    it('renders positions when data is available', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [mockPosition],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      renderWithProviders(<PredictTabView />);

      expect(screen.getByTestId('position-pos-1')).toBeOnTheScreen();
      expect(screen.getByText('Test Position')).toBeOnTheScreen();
    });

    it('shows footer button when positions exist', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [mockPosition],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      renderWithProviders(<PredictTabView />);

      expect(screen.getByTestId('predict-new-button')).toBeOnTheScreen();
    });

    it('navigates to market details when position is pressed', () => {
      mockUsePredictPositions.mockReturnValue({
        positions: [mockPosition],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      renderWithProviders(<PredictTabView />);

      fireEvent.press(screen.getByTestId('position-pos-1'));

      expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
        screen: 'PredictMarketDetails',
        params: {
          marketId: mockPosition.marketId,
          headerShown: false,
        },
      });
    });
  });

  describe('MarketsWonCard', () => {
    it('renders MarketsWonCard when claimable positions exist', () => {
      mockUsePredictPositions.mockImplementation(
        (options: { claimable?: boolean } = {}) => {
          if (options.claimable) {
            // Claimable positions call
            return {
              positions: [mockClaimablePosition],
              isLoading: false,
              isRefreshing: false,
              error: null,
              loadPositions: mockLoadClaimablePositions,
            };
          }
          // Regular positions call
          return {
            positions: [],
            isLoading: false,
            isRefreshing: false,
            error: null,
            loadPositions: mockLoadPositions,
          };
        },
      );

      renderWithProviders(<PredictTabView />);

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
      expect(screen.getByTestId('markets-won-count')).toHaveTextContent('1');
      expect(screen.getByTestId('claimable-amount')).toHaveTextContent('15');
    });

    it('does not render MarketsWonCard when no claimable positions', () => {
      // Default mock already returns empty arrays, so no need to override
      renderWithProviders(<PredictTabView />);

      expect(screen.queryByTestId('markets-won-card')).not.toBeOnTheScreen();
    });
  });

  describe('Claim Functionality', () => {
    it('calls claim function when claim button is pressed', () => {
      mockUsePredictPositions.mockImplementation(
        (options: { claimable?: boolean } = {}) => {
          if (options.claimable) {
            return {
              positions: [mockClaimablePosition],
              isLoading: false,
              isRefreshing: false,
              error: null,
              loadPositions: mockLoadClaimablePositions,
            };
          }
          return {
            positions: [],
            isLoading: false,
            isRefreshing: false,
            error: null,
            loadPositions: mockLoadPositions,
          };
        },
      );

      renderWithProviders(<PredictTabView />);

      fireEvent.press(screen.getByTestId('markets-won-card'));

      expect(mockClaim).toHaveBeenCalledWith({
        positions: [mockClaimablePosition],
      });
    });
  });

  describe('Additional Coverage', () => {
    it('covers keyExtractor function', () => {
      const mockPositionWithOutcome = {
        id: 'pos-1',
        outcomeId: 'outcome-1',
        outcomeIndex: 1,
        title: 'Test Position',
        cashPnl: 10,
      };

      mockUsePredictPositions.mockReturnValue({
        positions: [mockPositionWithOutcome],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });

      renderWithProviders(<PredictTabView />);

      // The keyExtractor should be called for each position
      expect(screen.getByTestId('position-pos-1')).toBeOnTheScreen();
    });

    it('covers isClaiming loading state', () => {
      mockUsePredictClaim.mockReturnValue({
        claim: mockClaim,
        loading: true, // This covers the isClaiming state
      });

      mockUsePredictPositions.mockImplementation(
        (options: { claimable?: boolean } = {}) => {
          if (options.claimable) {
            return {
              positions: [mockClaimablePosition],
              isLoading: false,
              isRefreshing: false,
              error: null,
              loadPositions: mockLoadClaimablePositions,
            };
          }
          return {
            positions: [],
            isLoading: false,
            isRefreshing: false,
            error: null,
            loadPositions: mockLoadPositions,
          };
        },
      );

      renderWithProviders(<PredictTabView />);

      expect(screen.getByTestId('markets-won-card')).toBeOnTheScreen();
    });
  });
});
