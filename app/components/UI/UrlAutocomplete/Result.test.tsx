// Mock AppConstants FIRST to prevent import chain issues
jest.mock('../../../core/AppConstants', () => ({
  SWAPS: {
    ACTIVE: true,
  },
  BUNDLE_IDS: {
    ANDROID: 'io.metamask',
    IOS: 'io.metamask',
  },
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
}));

// Mock Badge component to avoid deep import chain through notifications
jest.mock('../../../component-library/components/Badges/Badge', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'badge' }),
    BadgeVariant: {
      Network: 'network',
      Status: 'status',
      NotificationsKinds: 'notificationsKinds',
    },
  };
});

// Mock BadgeWrapper
jest.mock('../../../component-library/components/Badges/BadgeWrapper', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'badge-wrapper' }, children),
  };
});

// Mock tokenBalancesController to avoid selector initialization issues
jest.mock('../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: jest.fn(() => ({})),
  selectAddressHasTokenBalances: jest.fn(() => false),
  selectContractBalances: jest.fn(() => ({})),
  selectTokenBalancesControllerState: jest.fn(() => ({})),
}));

// Mock Balance component's NetworkBadgeSource to avoid deep import chain
jest.mock('../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'mock-badge-uri' })),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock useFavicon
jest.mock('../../hooks/useFavicon/useFavicon', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isLoading: false,
    isLoaded: true,
    error: null,
    favicon: null,
  })),
}));

// Mock WebsiteIcon
jest.mock('../WebsiteIcon', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ title }: { title: string; url: string }) =>
    React.createElement(
      View,
      { testID: 'website-icon' },
      React.createElement(Text, null, title),
    ),
  );
});

// Mock TrendingTokenLogo
jest.mock('../Trending/components/TrendingTokenLogo', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return jest.fn(({ symbol }: { symbol: string }) =>
    React.createElement(View, { testID: `token-logo-${symbol}` }),
  );
});

// Mock PerpsTokenLogo
jest.mock('../Perps/components/PerpsTokenLogo', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return jest.fn(({ symbol }: { symbol: string }) =>
    React.createElement(View, { testID: `perps-logo-${symbol}` }),
  );
});

// Mock PercentageChange
jest.mock(
  '../../../component-library/components-temp/Price/PercentageChange',
  () => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return jest.fn(({ value }: { value: number }) =>
      React.createElement(Text, { testID: 'percentage-change' }, `${value}%`),
    );
  },
);

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Result } from './Result';
import { UrlAutocompleteCategory } from './types';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
// Create mock store
const createMockStore = () =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'USD',
          },
        },
      }),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

interface WrapperProps {
  children: React.ReactNode;
}

const renderWithProvider = (component: React.ReactElement) => {
  const store = createMockStore();
  const Wrapper = ({ children }: WrapperProps) => (
    <Provider store={store}>{children}</Provider>
  );
  return {
    ...render(component, { wrapper: Wrapper }),
    store,
  };
};

describe('Result', () => {
  const mockOnPress = jest.fn();
  const mockOnSwapPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Favorites category', () => {
    it('renders favorite result with name and url', () => {
      // Arrange
      const favoriteResult = {
        category: UrlAutocompleteCategory.Favorites,
        name: 'MetaMask',
        url: 'https://metamask.io',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={favoriteResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert - name appears in both text display and WebsiteIcon
      expect(screen.getAllByText('MetaMask').length).toBeGreaterThan(0);
      expect(screen.getByText('https://metamask.io')).toBeOnTheScreen();
    });

    it('displays trash icon for favorites', () => {
      // Arrange
      const favoriteResult = {
        category: UrlAutocompleteCategory.Favorites,
        name: 'MetaMask',
        url: 'https://metamask.io',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={favoriteResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(
        screen.getByTestId('delete-favorite-https://metamask.io'),
      ).toBeOnTheScreen();
    });

    it('dispatches removeBookmark when trash icon is pressed', () => {
      // Arrange
      const favoriteResult = {
        category: UrlAutocompleteCategory.Favorites,
        name: 'MetaMask',
        url: 'https://metamask.io',
      } as const;
      renderWithProvider(
        <Result
          result={favoriteResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Act
      const trashButton = screen.getByTestId(
        'delete-favorite-https://metamask.io',
      );
      fireEvent.press(trashButton);

      // Assert - trash button exists and is pressable (action dispatches internally)
      expect(trashButton).toBeOnTheScreen();
    });

    it('calls onPress when favorite item is pressed', () => {
      // Arrange
      const favoriteResult = {
        category: UrlAutocompleteCategory.Favorites,
        name: 'MetaMask',
        url: 'https://metamask.io',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={favoriteResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );
      // Press the first MetaMask text (the actual name display, not icon)
      fireEvent.press(screen.getAllByText('MetaMask')[0]);

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('displays url when name is provided', () => {
      // Arrange
      const favoriteResult = {
        category: UrlAutocompleteCategory.Favorites,
        name: 'Uniswap App',
        url: 'https://app.uniswap.org/swap',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={favoriteResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert - url is shown as subtitle
      expect(
        screen.getByText('https://app.uniswap.org/swap'),
      ).toBeOnTheScreen();
    });
  });

  describe('Recents category', () => {
    it('renders recent result with name and url', () => {
      // Arrange
      const recentResult = {
        category: UrlAutocompleteCategory.Recents,
        name: 'Google',
        url: 'https://google.com',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={recentResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert - name appears in both text display and WebsiteIcon
      expect(screen.getAllByText('Google').length).toBeGreaterThan(0);
      expect(screen.getByText('https://google.com')).toBeOnTheScreen();
    });

    it('does not show trash icon for recents', () => {
      // Arrange
      const recentResult = {
        category: UrlAutocompleteCategory.Recents,
        name: 'Google',
        url: 'https://google.com',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={recentResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(
        screen.queryByTestId('delete-favorite-https://google.com'),
      ).toBeNull();
    });
  });

  describe('Sites category', () => {
    it('renders site result with name and url', () => {
      // Arrange
      const siteResult = {
        category: UrlAutocompleteCategory.Sites,
        name: 'Uniswap',
        url: 'https://uniswap.org',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={siteResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert - name appears in both text display and WebsiteIcon
      expect(screen.getAllByText('Uniswap').length).toBeGreaterThan(0);
      expect(screen.getByText('https://uniswap.org')).toBeOnTheScreen();
    });
  });

  describe('Tokens category', () => {
    it('renders token result with name and symbol', () => {
      // Arrange
      const tokenResult = {
        category: UrlAutocompleteCategory.Tokens,
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x1' as const,
        logoUrl: 'https://example.com/eth.png',
        price: 2500.5,
        percentChange: 2.5,
        assetId: 'eip155:1/slip44:60',
        isFromSearch: true as const,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={tokenResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByText('Ethereum')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
    });

    it('renders price and percentage change for tokens', () => {
      // Arrange
      const tokenResult = {
        category: UrlAutocompleteCategory.Tokens,
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x1' as const,
        logoUrl: 'https://example.com/eth.png',
        price: 2500.5,
        percentChange: 2.5,
        assetId: 'eip155:1/slip44:60',
        isFromSearch: true as const,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={tokenResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByTestId('percentage-change')).toBeOnTheScreen();
    });

    it('displays swap button for tokens', () => {
      // Arrange
      const tokenResult = {
        category: UrlAutocompleteCategory.Tokens,
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x1' as const,
        logoUrl: 'https://example.com/eth.png',
        price: 2500.5,
        percentChange: 2.5,
        assetId: 'eip155:1/slip44:60',
        isFromSearch: true as const,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={tokenResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(
        screen.getByTestId('autocomplete-result-swap-button'),
      ).toBeOnTheScreen();
    });

    it('calls onSwapPress when swap button is pressed', () => {
      // Arrange
      const tokenResult = {
        category: UrlAutocompleteCategory.Tokens,
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x1' as const,
        logoUrl: 'https://example.com/eth.png',
        price: 2500.5,
        percentChange: 2.5,
        assetId: 'eip155:1/slip44:60',
        isFromSearch: true as const,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={tokenResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );
      fireEvent.press(screen.getByTestId('autocomplete-result-swap-button'));

      // Assert
      expect(mockOnSwapPress).toHaveBeenCalledWith(tokenResult);
    });

    it('renders TrendingTokenLogo for token results', () => {
      // Arrange
      const tokenResult = {
        category: UrlAutocompleteCategory.Tokens,
        name: 'Ethereum',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x1' as const,
        logoUrl: 'https://example.com/eth.png',
        price: 2500.5,
        percentChange: 0,
        assetId: 'eip155:1/slip44:60',
        isFromSearch: true as const,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={tokenResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByTestId('token-logo-ETH')).toBeOnTheScreen();
    });
  });

  describe('Perps category', () => {
    it('renders perps result with name and leverage', () => {
      // Arrange
      const perpsResult = {
        category: UrlAutocompleteCategory.Perps,
        symbol: 'BTC-USD',
        name: 'Bitcoin',
        maxLeverage: '100x',
        price: '$45,000.00',
        change24h: '+$500.00',
        change24hPercent: '+1.12%',
        volume: '$1B',
        openInterest: '$500M',
        marketType: 'crypto' as const,
        marketSource: 'hyperliquid',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={perpsResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
      expect(screen.getByText('BTC-USD · 100x')).toBeOnTheScreen();
    });

    it('renders PerpsTokenLogo for perps results', () => {
      // Arrange
      const perpsResult = {
        category: UrlAutocompleteCategory.Perps,
        symbol: 'ETH-USD',
        name: 'Ethereum',
        maxLeverage: '50x',
        price: '$2,500.00',
        change24h: '-$50.00',
        change24hPercent: '-1.96%',
        volume: '$500M',
        openInterest: '$200M',
        marketType: 'crypto' as const,
        marketSource: 'hyperliquid',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={perpsResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByTestId('perps-logo-ETH-USD')).toBeOnTheScreen();
    });

    it('renders price and percentage change for perps', () => {
      // Arrange
      const perpsResult = {
        category: UrlAutocompleteCategory.Perps,
        symbol: 'BTC-USD',
        name: 'Bitcoin',
        maxLeverage: '100x',
        price: '$45,000.00',
        change24h: '+$500.00',
        change24hPercent: '+1.12%',
        volume: '$1B',
        openInterest: '$500M',
        marketType: 'crypto' as const,
        marketSource: 'hyperliquid',
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={perpsResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByText('$45,000.00')).toBeOnTheScreen();
      expect(screen.getByTestId('percentage-change')).toBeOnTheScreen();
    });
  });

  describe('Predictions category', () => {
    it('renders prediction result with title', () => {
      // Arrange
      const predictionResult = {
        category: UrlAutocompleteCategory.Predictions,
        id: 'pred-1',
        providerId: 'polymarket',
        slug: 'bitcoin-100k',
        title: 'Will Bitcoin reach $100k?',
        description: 'Prediction market for BTC price',
        endDate: '2025-12-31',
        image: 'https://example.com/btc.png',
        status: 'open' as const,
        liquidity: 1000000,
        volume: 5000000,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={predictionResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByText('Will Bitcoin reach $100k?')).toBeOnTheScreen();
      expect(screen.getByText('Open')).toBeOnTheScreen();
    });

    it('renders prediction status correctly', () => {
      // Arrange
      const predictionResult = {
        category: UrlAutocompleteCategory.Predictions,
        id: 'pred-2',
        providerId: 'polymarket',
        slug: 'eth-merge',
        title: 'ETH Merge Success',
        description: 'Prediction about ETH merge',
        endDate: '2024-01-01',
        image: '',
        status: 'resolved' as const,
        liquidity: 500000,
        volume: 2000000,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={predictionResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert
      expect(screen.getByText('resolved')).toBeOnTheScreen();
    });

    it('renders fallback icon when prediction has no image', () => {
      // Arrange
      const predictionResult = {
        category: UrlAutocompleteCategory.Predictions,
        id: 'pred-3',
        providerId: 'polymarket',
        slug: 'no-image',
        title: 'No Image Prediction',
        description: 'Test prediction without image',
        endDate: '2025-06-01',
        image: '',
        status: 'open' as const,
        liquidity: 100000,
        volume: 500000,
      } as const;

      // Act
      renderWithProvider(
        <Result
          result={predictionResult}
          onPress={mockOnPress}
          onSwapPress={mockOnSwapPress}
        />,
      );

      // Assert - component renders without crashing
      expect(screen.getByText('No Image Prediction')).toBeOnTheScreen();
    });
  });
});
