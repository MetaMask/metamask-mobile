import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import SitesFullView from './SitesFullView';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import type { SiteData } from '../../UI/Sites/components/SiteRowItem/SiteRowItem';

// Mock dependencies
jest.mock('../../UI/Sites/hooks/useSiteData/useSitesData');

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
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

jest.mock('../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      background: { default: '#FFFFFF' },
      primary: { default: '#037DD6' },
      icon: { default: '#24272A' },
    },
  }),
}));

jest.mock('../../UI/shared/ListHeaderWithSearch/ListHeaderWithSearch', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(
    ({
      defaultTitle,
      isSearchVisible,
      searchQuery,
      onSearchQueryChange,
      onBack,
      onSearchToggle,
      testID,
    }) => (
      <ReactNative.View testID={testID}>
        {!isSearchVisible ? (
          <>
            <ReactNative.TouchableOpacity
              testID={`${testID}-back-button`}
              onPress={onBack}
            >
              <ReactNative.Text>Back</ReactNative.Text>
            </ReactNative.TouchableOpacity>
            <ReactNative.Text testID={`${testID}-title`}>
              {defaultTitle}
            </ReactNative.Text>
            <ReactNative.TouchableOpacity
              testID={`${testID}-search-toggle`}
              onPress={onSearchToggle}
            >
              <ReactNative.Text>Search</ReactNative.Text>
            </ReactNative.TouchableOpacity>
          </>
        ) : (
          <>
            <ReactNative.TextInput
              testID={`${testID}-search-bar`}
              value={searchQuery}
              onChangeText={onSearchQueryChange}
            />
            <ReactNative.TouchableOpacity
              testID={`${testID}-search-close`}
              onPress={onSearchToggle}
            >
              <ReactNative.Text>Cancel</ReactNative.Text>
            </ReactNative.TouchableOpacity>
          </>
        )}
      </ReactNative.View>
    ),
  );
});

jest.mock('../../UI/Sites/components/SitesList/SitesList', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(({ sites, refreshControl, ListFooterComponent }) => (
    <ReactNative.View testID="sites-list">
      {sites.map((site: SiteData) => (
        <ReactNative.View key={site.id} testID={`site-item-${site.id}`}>
          <ReactNative.Text>{site.name}</ReactNative.Text>
        </ReactNative.View>
      ))}
      {refreshControl && (
        <ReactNative.View testID="refresh-control">
          {refreshControl}
        </ReactNative.View>
      )}
      {ListFooterComponent}
    </ReactNative.View>
  ));
});

jest.mock('../../UI/Sites/components/SiteSkeleton/SiteSkeleton', () =>
  jest.fn(() => {
    const ReactNative = jest.requireActual('react-native');
    return (
      <ReactNative.View testID="site-skeleton">
        <ReactNative.Text>Loading...</ReactNative.Text>
      </ReactNative.View>
    );
  }),
);

jest.mock(
  '../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return jest.fn(({ searchQuery }) =>
      searchQuery ? (
        <ReactNative.View testID="sites-search-footer">
          <ReactNative.Text>{searchQuery}</ReactNative.Text>
        </ReactNative.View>
      ) : null,
    );
  },
);

const mockUseSitesData = useSitesData as jest.Mock;
const mockRefetch = jest.fn();

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

  const setupMockWithSearchFilter = () => {
    mockUseSitesData.mockImplementation((searchQuery: string) => {
      let filteredSites = mockSites;

      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredSites = mockSites.filter(
          (site) =>
            site.name.toLowerCase().includes(query) ||
            site.displayUrl.toLowerCase().includes(query) ||
            site.url.toLowerCase().includes(query),
        );
      }

      return {
        sites: filteredSites,
        isLoading: false,
        refetch: mockRefetch,
      };
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockClear();
  });

  describe('Rendering', () => {
    it('renders header with back button and title', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(<SitesFullView />);

      expect(getByTestId('sites-full-view-header')).toBeOnTheScreen();
      expect(
        getByTestId('sites-full-view-header-back-button'),
      ).toBeOnTheScreen();
      expect(getByTestId('sites-full-view-header-title')).toBeOnTheScreen();
      expect(
        getByTestId('sites-full-view-header-search-toggle'),
      ).toBeOnTheScreen();
    });

    it('renders SitesList component with all site items', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(<SitesFullView />);

      expect(getByTestId('sites-list')).toBeOnTheScreen();
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });

    it('renders skeletons when loading', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: true,
        refetch: mockRefetch,
      });

      const { getAllByTestId } = render(<SitesFullView />);

      const skeletons = getAllByTestId('site-skeleton');
      expect(skeletons.length).toBe(15);
    });

    it('renders RefreshControl', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(<SitesFullView />);

      expect(getByTestId('refresh-control')).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(<SitesFullView />);
      const backButton = getByTestId('sites-full-view-header-back-button');

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Search Functionality', () => {
    it('filters sites by name, URL, and display URL', () => {
      setupMockWithSearchFilter();

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('sites-full-view-header-search-toggle'));
      const searchInput = getByTestId('sites-full-view-header-search-bar');

      // Search by name
      fireEvent.changeText(searchInput, 'Meta');
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(queryByTestId('site-item-2')).toBeNull();

      // Search by URL
      fireEvent.changeText(searchInput, 'opensea');
      expect(queryByTestId('site-item-1')).toBeNull();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();

      // Search by display URL
      fireEvent.changeText(searchInput, 'uniswap.org');
      expect(queryByTestId('site-item-2')).toBeNull();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });

    it('shows all sites when search query is empty', () => {
      setupMockWithSearchFilter();

      const { getByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('sites-full-view-header-search-toggle'));
      const searchInput = getByTestId('sites-full-view-header-search-bar');

      // Empty search
      fireEvent.changeText(searchInput, '');

      // All sites should be visible
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });

    it('clears search query when search is closed', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('sites-full-view-header-search-toggle'));
      const searchInput = getByTestId('sites-full-view-header-search-bar');

      // Type search query
      fireEvent.changeText(searchInput, 'test');

      // Close search
      fireEvent.press(getByTestId('sites-full-view-header-search-close'));

      // Reopen search
      fireEvent.press(getByTestId('sites-full-view-header-search-toggle'));

      // Search input should be empty
      const newSearchInput = getByTestId('sites-full-view-header-search-bar');
      expect(newSearchInput.props.value).toBe('');
    });

    it('displays SitesSearchFooter when search is active', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Initially no footer
      expect(queryByTestId('sites-search-footer')).toBeNull();

      // Activate search
      fireEvent.press(getByTestId('sites-full-view-header-search-toggle'));
      const searchInput = getByTestId('sites-full-view-header-search-bar');

      // Type search query
      fireEvent.changeText(searchInput, 'test');

      // Footer should appear
      expect(getByTestId('sites-search-footer')).toBeOnTheScreen();
    });

    it('hides SitesSearchFooter when search query is empty or search is inactive', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Footer should not appear when search is inactive
      expect(queryByTestId('sites-search-footer')).toBeNull();

      // Activate search
      fireEvent.press(getByTestId('sites-full-view-header-search-toggle'));

      // Footer should not appear with empty query
      expect(queryByTestId('sites-search-footer')).toBeNull();
    });
  });

  describe('Data Fetching', () => {
    it('fetches sites with limit of 100', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      render(<SitesFullView />);

      expect(mockUseSitesData).toHaveBeenCalledWith('', 100);
    });

    it('calls refetch when refresh is triggered', async () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        refetch: mockRefetch,
      });

      render(<SitesFullView />);

      const SitesListMock = jest.requireMock(
        '../../UI/Sites/components/SitesList/SitesList',
      );

      // Get the refreshControl prop passed to SitesList
      const sitesListProps = SitesListMock.mock.calls[0][0];
      const refreshControl = sitesListProps.refreshControl;

      expect(refreshControl).toBeDefined();

      // Simulate refresh
      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
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
        refetch: mockRefetch,
      });

      const { getByTestId } = render(<SitesFullView />);

      expect(getByTestId('site-item-1')).toBeOnTheScreen();
    });

    it('handles empty sites array', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      expect(getByTestId('sites-list')).toBeOnTheScreen();
      expect(queryByTestId('site-item-1')).toBeNull();
    });

    it('performs case-insensitive search', () => {
      setupMockWithSearchFilter();

      const { getByTestId, queryByTestId } = render(<SitesFullView />);

      // Activate search
      fireEvent.press(getByTestId('sites-full-view-header-search-toggle'));
      const searchInput = getByTestId('sites-full-view-header-search-bar');

      // Search with different case
      fireEvent.changeText(searchInput, 'METAMASK');

      // MetaMask should still be found
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(queryByTestId('site-item-2')).toBeNull();
    });
  });
});
