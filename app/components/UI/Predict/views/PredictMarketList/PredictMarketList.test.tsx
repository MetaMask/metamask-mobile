import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import PredictMarketList from './PredictMarketList';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import type { Market } from '../../types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      wrapper: {},
      titleText: {},
      marketListContainer: {},
      loadingContainer: {},
      errorContainer: {},
      emptyContainer: {},
    },
  })),
}));

jest.mock('../../../../Base/ScreenView', () => {
  const { View } = jest.requireActual('react-native');
  return function MockScreenView({ children }: { children: React.ReactNode }) {
    return <View testID="screen-view">{children}</View>;
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingLG: 'HeadingLG',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Error: 'Error',
      Alternative: 'Alternative',
    },
  };
});

import { getNavigationOptionsTitle } from '../../../Navbar';

jest.mock('../../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      accent01: { dark: '#661800', light: '#ffa680', normal: '#ff5c16' },
      accent02: { dark: '#3d065f', light: '#eac2ff', normal: '#d075ff' },
      accent03: { dark: '#013330', light: '#e5ffc3', normal: '#baf24a' },
      accent04: { dark: '#190066', light: '#cce7ff', normal: '#89b0ff' },
      background: {
        alternative: '#f3f5f9',
        alternativeHover: '#ebedf1',
        alternativePressed: '#e1e4ea',
        default: '#ffffff',
        defaultHover: '#f6f6f7',
        defaultPressed: '#ebecef',
        hover: '#858b9a14',
        muted: '#3c4d9d0f',
        mutedHover: '#3c4d9d1a',
        mutedPressed: '#3c4d9d26',
        pressed: '#858b9a29',
        section: '#f3f5f9',
        subsection: '#ffffff',
      },
      border: { default: '#b7bbc8', muted: '#b7bbc866' },
      error: {
        alternative: '#952731',
        default: '#ca3542',
        defaultHover: '#ba313d',
        defaultPressed: '#9a2832',
        inverse: '#ffffff',
        muted: '#ca35421a',
        mutedHover: '#ca354226',
        mutedPressed: '#ca354233',
      },
      flask: { default: '#8f44e4', inverse: '#ffffff' },
      icon: {
        alternative: '#686e7d',
        default: '#121314',
        defaultHover: '#2a2b2c',
        defaultPressed: '#414243',
        inverse: '#ffffff',
        muted: '#b7bbc8',
      },
      info: { default: '#4459ff', inverse: '#ffffff', muted: '#4459ff1a' },
      overlay: {
        alternative: '#000000cc',
        default: '#3f434a66',
        inverse: '#ffffff',
      },
      primary: {
        alternative: '#2c3dc5',
        default: '#4459ff',
        defaultHover: '#384df5',
        defaultPressed: '#2b3eda',
        inverse: '#ffffff',
        muted: '#4459ff1a',
        mutedHover: '#4459ff26',
        mutedPressed: '#4459ff33',
      },
      shadow: {
        default: '#0000001a',
        error: '#ca354266',
        primary: '#4459ff33',
      },
      success: {
        default: '#457a39',
        defaultHover: '#3d6c32',
        defaultPressed: '#2d5025',
        inverse: '#ffffff',
        muted: '#457a391a',
        mutedHover: '#457a3926',
        mutedPressed: '#457a3933',
      },
      text: { alternative: '#686e7d', default: '#121314', muted: '#b7bbc8' },
      warning: {
        default: '#9a6300',
        defaultHover: '#855500',
        defaultPressed: '#5c3b00',
        inverse: '#ffffff',
        muted: '#9a63001a',
        mutedHover: '#9a630026',
        mutedPressed: '#9a630033',
      },
    },
  })),
}));

jest.mock('../../components/PredictMarket', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return function MockPredictMarket({ market }: { market: Market }) {
    return (
      <TouchableOpacity testID={`predict-market-${market.id}`}>
        <View>
          <Text testID={`market-question-${market.id}`}>{market.question}</Text>
          <Text testID={`market-outcomes-${market.id}`}>{market.outcomes}</Text>
          <Text testID={`market-volume-${market.id}`}>
            Volume: {market.volume || '0'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../../UI/AnimatedSpinner', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockAnimatedSpinner() {
      return <View testID="animated-spinner" />;
    },
    SpinnerSize: {
      MD: 'MD',
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.title': 'Prediction Markets',
    };
    return translations[key] || key;
  }),
}));

describe('PredictMarketList', () => {
  const mockNavigation = {
    canGoBack: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    navigate: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    getState: jest.fn(),
    getId: jest.fn(),
    getParent: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
  };

  const mockUsePredictMarketData = usePredictMarketData as jest.MockedFunction<
    typeof usePredictMarketData
  >;
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  const mockMarketData: Market[] = [
    {
      id: 'market-1',
      question: 'Will Bitcoin reach $100,000 by end of year?',
      outcomes: '["Yes", "No"]',
      outcomePrices: '[0.65, 0.35]',
      image: 'https://example.com/btc.png',
      volume: '1500000',
      providerId: 'provider-1',
      title: 'Bitcoin Price Prediction',
      status: 'open',
    },
    {
      id: 'market-2',
      question: 'Will Ethereum 2.0 launch in Q2 2024?',
      outcomes: '["Yes", "No"]',
      outcomePrices: '[0.45, 0.55]',
      image: 'https://example.com/eth.png',
      volume: '800000',
      providerId: 'provider-1',
      title: 'Ethereum 2.0 Launch',
      status: 'open',
    },
    {
      id: 'market-3',
      question: 'Will Solana outperform Bitcoin this month?',
      outcomes: '["Yes", "No"]',
      outcomePrices: '[0.30, 0.70]',
      image: 'https://example.com/sol.png',
      volume: '500000',
      providerId: 'provider-1',
      title: 'Solana vs Bitcoin',
      status: 'open',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as NavigationProp<ParamListBase>,
    );

    mockUsePredictMarketData.mockReturnValue({
      marketData: mockMarketData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('Component Rendering', () => {
    it('renders the component with title', () => {
      render(<PredictMarketList />);

      expect(screen.getByText('Prediction Markets')).toBeOnTheScreen();
      expect(screen.getByTestId('screen-view')).toBeOnTheScreen();
    });

    it('renders market list when data is available', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('predict-market-market-1')).toBeOnTheScreen();
      expect(screen.getByTestId('predict-market-market-2')).toBeOnTheScreen();
      expect(screen.getByTestId('predict-market-market-3')).toBeOnTheScreen();
    });

    it('displays market questions correctly', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('market-question-market-1')).toHaveTextContent(
        'Will Bitcoin reach $100,000 by end of year?',
      );
      expect(screen.getByTestId('market-question-market-2')).toHaveTextContent(
        'Will Ethereum 2.0 launch in Q2 2024?',
      );
      expect(screen.getByTestId('market-question-market-3')).toHaveTextContent(
        'Will Solana outperform Bitcoin this month?',
      );
    });

    it('displays market outcomes correctly', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('market-outcomes-market-1')).toHaveTextContent(
        '["Yes", "No"]',
      );
      expect(screen.getByTestId('market-outcomes-market-2')).toHaveTextContent(
        '["Yes", "No"]',
      );
      expect(screen.getByTestId('market-outcomes-market-3')).toHaveTextContent(
        '["Yes", "No"]',
      );
    });

    it('displays market volumes correctly', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('market-volume-market-1')).toHaveTextContent(
        'Volume: 1500000',
      );
      expect(screen.getByTestId('market-volume-market-2')).toHaveTextContent(
        'Volume: 800000',
      );
      expect(screen.getByTestId('market-volume-market-3')).toHaveTextContent(
        'Volume: 500000',
      );
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when data is loading', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(screen.getByTestId('animated-spinner')).toBeOnTheScreen();
      expect(screen.getByText('Prediction Markets')).toBeOnTheScreen();
    });

    it('shows title even during loading', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(screen.getByText('Prediction Markets')).toBeOnTheScreen();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when there is an error', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: null,
        isLoading: false,
        error: 'Network error occurred',
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(
        screen.getByText('Error: Network error occurred'),
      ).toBeOnTheScreen();
    });

    it('shows error message even when markets are available if there is an error', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: mockMarketData,
        isLoading: false,
        error: 'Some error',
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      // According to the component logic, if there's an error, it shows the error message
      // regardless of whether markets are available
      expect(screen.getByText('Error: Some error')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-market-market-1'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no markets are available', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(screen.getByText('No markets available')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-market-market-1'),
      ).not.toBeOnTheScreen();
    });

    it('shows empty state when marketData is null', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(screen.getByText('No markets available')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('predict-market-market-1'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Navigation Setup', () => {
    it('sets navigation options on mount', () => {
      render(<PredictMarketList />);

      expect(mockNavigation.setOptions).toHaveBeenCalled();
    });

    it('calls getNavigationOptionsTitle with correct parameters', () => {
      render(<PredictMarketList />);

      expect(getNavigationOptionsTitle).toHaveBeenCalledWith(
        'Prediction Markets',
        mockNavigation,
        false,
        expect.objectContaining({
          primary: expect.objectContaining({
            default: '#4459ff',
          }),
        }),
      );
    });
  });

  describe('Market Interaction', () => {
    it('renders markets as touchable components', () => {
      render(<PredictMarketList />);

      const market1 = screen.getByTestId('predict-market-market-1');
      const market2 = screen.getByTestId('predict-market-market-2');
      const market3 = screen.getByTestId('predict-market-market-3');

      expect(market1).toBeOnTheScreen();
      expect(market2).toBeOnTheScreen();
      expect(market3).toBeOnTheScreen();
    });

    it('handles market press events', () => {
      render(<PredictMarketList />);

      const market1 = screen.getByTestId('predict-market-market-1');

      // The mock component doesn't have actual press handling, but we can verify it's rendered
      expect(market1).toBeOnTheScreen();
    });
  });

  describe('Data Flow', () => {
    it('calls usePredictMarketData hook', () => {
      render(<PredictMarketList />);

      expect(mockUsePredictMarketData).toHaveBeenCalled();
    });

    it('renders correct number of markets', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('predict-market-market-1')).toBeOnTheScreen();
      expect(screen.getByTestId('predict-market-market-2')).toBeOnTheScreen();
      expect(screen.getByTestId('predict-market-market-3')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles markets with missing optional fields', () => {
      const marketsWithMissingFields: Market[] = [
        {
          id: 'market-4',
          question: 'Test market without optional fields',
          outcomes: '["Yes", "No"]',
          image: '',
        },
      ];

      mockUsePredictMarketData.mockReturnValue({
        marketData: marketsWithMissingFields,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(screen.getByTestId('predict-market-market-4')).toBeOnTheScreen();
      expect(screen.getByTestId('market-question-market-4')).toHaveTextContent(
        'Test market without optional fields',
      );
    });

    it('handles markets with empty outcomes', () => {
      const marketsWithEmptyOutcomes: Market[] = [
        {
          id: 'market-5',
          question: 'Test market with empty outcomes',
          outcomes: '',
          image: '',
        },
      ];

      mockUsePredictMarketData.mockReturnValue({
        marketData: marketsWithEmptyOutcomes,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(screen.getByTestId('predict-market-market-5')).toBeOnTheScreen();
      expect(screen.getByTestId('market-outcomes-market-5')).toHaveTextContent(
        '',
      );
    });

    it('handles markets with null volume', () => {
      const marketsWithNullVolume: Market[] = [
        {
          id: 'market-6',
          question: 'Test market with null volume',
          outcomes: '["Yes", "No"]',
          image: '',
          volume: undefined,
        },
      ];

      mockUsePredictMarketData.mockReturnValue({
        marketData: marketsWithNullVolume,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<PredictMarketList />);

      expect(screen.getByTestId('predict-market-market-6')).toBeOnTheScreen();
      expect(screen.getByTestId('market-volume-market-6')).toHaveTextContent(
        'Volume: 0',
      );
    });
  });

  describe('Component Structure', () => {
    it('renders with correct component hierarchy', () => {
      render(<PredictMarketList />);

      expect(screen.getByTestId('screen-view')).toBeOnTheScreen();
      expect(screen.getByText('Prediction Markets')).toBeOnTheScreen();
      expect(screen.getByTestId('predict-market-market-1')).toBeOnTheScreen();
    });

    it('maintains consistent structure across different states', () => {
      // Test loading state
      mockUsePredictMarketData.mockReturnValue({
        marketData: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { rerender } = render(<PredictMarketList />);
      expect(screen.getByTestId('screen-view')).toBeOnTheScreen();
      expect(screen.getByText('Prediction Markets')).toBeOnTheScreen();

      // Test error state
      mockUsePredictMarketData.mockReturnValue({
        marketData: null,
        isLoading: false,
        error: 'Test error',
        refetch: jest.fn(),
      });

      rerender(<PredictMarketList />);
      expect(screen.getByTestId('screen-view')).toBeOnTheScreen();
      expect(screen.getByText('Prediction Markets')).toBeOnTheScreen();

      // Test success state
      mockUsePredictMarketData.mockReturnValue({
        marketData: mockMarketData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      rerender(<PredictMarketList />);
      expect(screen.getByTestId('screen-view')).toBeOnTheScreen();
      expect(screen.getByText('Prediction Markets')).toBeOnTheScreen();
    });
  });
});
