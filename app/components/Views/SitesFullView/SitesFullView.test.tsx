import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SitesFullView from './SitesFullView';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import type { SiteData } from '../../UI/Sites/components/SiteRowItem/SiteRowItem';

// Mock dependencies
jest.mock('../../UI/Sites/hooks/useSiteData/useSitesData');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 50, bottom: 34, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockTwStyle = jest.fn((...args: unknown[]) => {
  const flatArgs = args.flat().filter(Boolean);
  return flatArgs.reduce((acc: Record<string, unknown>, arg) => {
    if (typeof arg === 'string') {
      return { ...acc, [arg]: true };
    }
    if (typeof arg === 'object') {
      return { ...acc, ...arg };
    }
    return acc;
  }, {});
});

// Make mockTw callable as both function and object with style method
const mockTw = Object.assign(mockTwStyle, { style: mockTwStyle });

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => mockTw,
}));

jest.mock('../SectionSites/SiteRowItemWrapper', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(({ site }) => (
    <ReactNative.View testID={`site-item-${site.id}`}>
      <ReactNative.Text>{site.name}</ReactNative.Text>
    </ReactNative.View>
  ));
});

jest.mock('../SectionSites/SiteSkeleton/SiteSkeleton', () =>
  jest.fn(() => {
    const ReactNative = jest.requireActual('react-native');
    return (
      <ReactNative.View testID="site-skeleton">
        <ReactNative.Text>Loading...</ReactNative.Text>
      </ReactNative.View>
    );
  }),
);

jest.mock('../../../../component-library/components/HeaderBase', () => ({
  __esModule: true,
  default: jest.fn(({ children, startAccessory, endAccessory }) => {
    const ReactNative = jest.requireActual('react-native');
    return (
      <ReactNative.View testID="header-base">
        {startAccessory}
        {children}
        {endAccessory}
      </ReactNative.View>
    );
  }),
  HeaderBaseVariant: {
    Display: 'Display',
  },
}));

jest.mock(
  '../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: jest.fn(({ onPress, iconName, testID }) => {
      const ReactNative = jest.requireActual('react-native');
      return (
        <ReactNative.TouchableOpacity testID={testID} onPress={onPress}>
          <ReactNative.Text>{iconName}</ReactNative.Text>
        </ReactNative.TouchableOpacity>
      );
    }),
    ButtonIconSizes: {
      Lg: 'Lg',
    },
  }),
);

jest.mock('../ExploreSearchBar/ExploreSearchBar', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(({ searchQuery, onSearchChange, onCancel, placeholder }) => (
    <ReactNative.View testID="explore-search-bar">
      <ReactNative.TextInput
        testID="explore-view-search-input"
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder={placeholder || 'Search'}
      />
      <ReactNative.TouchableOpacity
        testID="explore-search-cancel-button"
        onPress={onCancel}
      >
        <ReactNative.Text>Cancel</ReactNative.Text>
      </ReactNative.TouchableOpacity>
    </ReactNative.View>
  ));
});

const mockUseSitesData = useSitesData as jest.Mock;

describe('SitesFullView', () => {
  const mockSites: SiteData[] = [
    {
      id: '1',
      name: 'MetaMask',
      url: 'https://metamask.io',
      displayUrl: 'metamask.io',
      logoUrl: 'https://example.com/metamask.png',
      featured: true,
    },
    {
      id: '2',
      name: 'OpenSea',
      url: 'https://opensea.io',
      displayUrl: 'opensea.io',
      logoUrl: 'https://example.com/opensea.png',
      featured: false,
    },
    {
      id: '3',
      name: 'Uniswap',
      url: 'https://uniswap.org',
      displayUrl: 'uniswap.org',
      logoUrl: 'https://example.com/uniswap.png',
      featured: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders header with back and search buttons', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      expect(getByTestId('header-base')).toBeOnTheScreen();
      expect(getByTestId('back-button')).toBeOnTheScreen();
      expect(getByTestId('search-button')).toBeOnTheScreen();
    });

    it('renders all site items', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });

    it('renders skeletons when loading', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: true,
        error: null,
      });

      const { getAllByTestId } = render(<SitesFullView />);

      const skeletons = getAllByTestId('site-skeleton');
      expect(skeletons.length).toBe(10);
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('navigates back when back button is pressed', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);
      const backButton = getByTestId('back-button');

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('activates search mode when search button is pressed', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);
      const searchButton = getByTestId('search-button');

      expect(queryByTestId('explore-search-bar')).toBeNull();

      fireEvent.press(searchButton);

      expect(getByTestId('explore-search-bar')).toBeOnTheScreen();
    });

    it('closes search mode when cancel button is pressed', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));
      expect(getByTestId('explore-search-bar')).toBeOnTheScreen();

      // Press cancel
      fireEvent.press(getByTestId('explore-search-cancel-button'));

      // Search should be closed
      expect(queryByTestId('explore-search-bar')).toBeNull();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('filters sites by name', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));
      const searchInput = getByTestId('explore-view-search-input');

      // Search for "Meta"
      fireEvent.changeText(searchInput, 'Meta');

      // Only MetaMask should be visible
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(queryByTestId('site-item-2')).toBeNull();
      expect(queryByTestId('site-item-3')).toBeNull();
    });

    it('filters sites by URL', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));
      const searchInput = getByTestId('explore-view-search-input');

      // Search for "opensea"
      fireEvent.changeText(searchInput, 'opensea');

      // Only OpenSea should be visible
      expect(queryByTestId('site-item-1')).toBeNull();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(queryByTestId('site-item-3')).toBeNull();
    });

    it('shows all sites when search query is empty', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));
      const searchInput = getByTestId('explore-view-search-input');

      // Empty search
      fireEvent.changeText(searchInput, '');

      // All sites should be visible
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });

    it('shows cancel button when search is active', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Initially no cancel button
      expect(queryByTestId('explore-search-cancel-button')).toBeNull();

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Cancel button should appear
      expect(getByTestId('explore-search-cancel-button')).toBeOnTheScreen();
    });

    it('clears search and closes search mode when cancel button is pressed', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search and type
      fireEvent.press(getByTestId('search-button'));
      const searchInput = getByTestId('explore-view-search-input');
      fireEvent.changeText(searchInput, 'test');

      // Cancel
      fireEvent.press(getByTestId('explore-search-cancel-button'));

      // Search should be closed
      expect(queryByTestId('explore-search-bar')).toBeNull();
    });

    it('shows search on Google option when there is a search query', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Initially no Google search option
      expect(queryByTestId('search-on-google-button')).toBeNull();

      // Type any search query
      fireEvent.changeText(getByTestId('explore-view-search-input'), 'test');

      // Google search option should appear
      expect(getByTestId('search-on-google-button')).toBeOnTheScreen();
    });

    it('navigates to Google search when search on Google button is pressed', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search and type
      fireEvent.press(getByTestId('search-button'));
      fireEvent.changeText(
        getByTestId('explore-view-search-input'),
        'test query',
      );

      // Press Google search button
      fireEvent.press(getByTestId('search-on-google-button'));

      // Should navigate to TrendingBrowser with Google search URL
      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          newTabUrl: 'https://www.google.com/search?q=test%20query',
          fromTrending: true,
        }),
      );
    });

    it('displays URL item when search query is a valid URL', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Type a valid URL
      fireEvent.changeText(
        getByTestId('explore-view-search-input'),
        'example.com',
      );

      // Should show the URL item
      expect(getByTestId('url-item')).toBeOnTheScreen();
    });

    it('displays URL item with https protocol', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Type a valid URL with protocol
      fireEvent.changeText(
        getByTestId('explore-view-search-input'),
        'https://example.com',
      );

      // Should show the URL item
      expect(getByTestId('url-item')).toBeOnTheScreen();
    });

    it('shows URL item separately from matching sites', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Type a URL that also matches existing sites
      fireEvent.changeText(
        getByTestId('explore-view-search-input'),
        'metamask.io',
      );

      // URL item should appear
      expect(getByTestId('url-item')).toBeOnTheScreen();
      // Original matching sites should still appear
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
    });

    it('shows both URL item and Google search option for valid URLs', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Type a valid URL
      fireEvent.changeText(
        getByTestId('explore-view-search-input'),
        'example.com',
      );

      // Should show both URL item
      expect(getByTestId('url-item')).toBeOnTheScreen();

      // AND Google search option
      expect(getByTestId('search-on-google-button')).toBeOnTheScreen();
    });

    it('navigates to URL when URL item is pressed', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search and type URL
      fireEvent.press(getByTestId('search-button'));
      fireEvent.changeText(
        getByTestId('explore-view-search-input'),
        'example.com',
      );

      // Press URL item
      fireEvent.press(getByTestId('url-item'));

      // Should navigate to the URL
      expect(mockNavigate).toHaveBeenCalledWith(
        'TrendingBrowser',
        expect.objectContaining({
          newTabUrl: 'https://example.com',
          fromTrending: true,
        }),
      );
    });

    it('does not show URL item for non-URL search queries', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Type a non-URL query
      fireEvent.changeText(getByTestId('explore-view-search-input'), 'meta');

      // URL item should not appear
      expect(queryByTestId('url-item')).toBeNull();

      // But matching sites should appear
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
    });

    it('hides Google search option when search query is empty', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('search-button'));

      // Google search should not appear with empty query
      expect(queryByTestId('search-on-google-button')).toBeNull();
    });
  });

  describe('Data Fetching', () => {
    it('fetches sites with limit of 100', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      render(<SitesFullView />);

      expect(mockUseSitesData).toHaveBeenCalledWith({ limit: 100 });
    });

    it('passes isViewAll prop to child components', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const SiteRowItemWrapper = jest.requireMock(
        '../SectionSites/SiteRowItemWrapper',
      );

      render(<SitesFullView />);

      expect(SiteRowItemWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          isViewAll: true,
        }),
        expect.anything(),
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles transition from loading to loaded', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: true,
        error: null,
      });

      const { rerender, getAllByTestId, queryByTestId, getByTestId } = render(
        <SitesFullView />,
      );

      expect(getAllByTestId('site-skeleton').length).toBe(10);

      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      rerender(<SitesFullView />);

      expect(queryByTestId('site-skeleton')).toBeNull();
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
    });

    it('handles sites with missing optional fields', () => {
      const minimalSites: SiteData[] = [
        {
          id: '1',
          name: 'Test',
          url: 'https://test.com',
          displayUrl: 'test.com',
        },
      ];

      mockUseSitesData.mockReturnValue({
        sites: minimalSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesFullView />);

      expect(getByTestId('site-item-1')).toBeOnTheScreen();
    });
  });
});
