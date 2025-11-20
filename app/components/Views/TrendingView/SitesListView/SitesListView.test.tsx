import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SitesListView from './SitesListView';
import { useSitesData } from '../SectionSites/hooks/useSitesData';
import type { SiteData } from '../SectionSites/SiteRowItem/SiteRowItem';

// Mock dependencies
jest.mock('../SectionSites/hooks/useSitesData');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 50, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args: unknown[]) => {
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
    }),
  })),
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

jest.mock('../ExploreSearchBar/ExploreSearchBar', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(
    ({ searchQuery, onSearchChange, onCancel, isSearchFocused }) => (
      <ReactNative.View testID="explore-search-bar">
        <ReactNative.TextInput
          testID="search-input"
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search"
          autoFocus={isSearchFocused}
        />
        <ReactNative.TouchableOpacity testID="cancel-button" onPress={onCancel}>
          <ReactNative.Text>Cancel</ReactNative.Text>
        </ReactNative.TouchableOpacity>
      </ReactNative.View>
    ),
  );
});

const mockUseSitesData = useSitesData as jest.Mock;

describe('SitesListView', () => {
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders search bar', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      expect(getByTestId('explore-search-bar')).toBeOnTheScreen();
    });

    it('renders Popular sites title', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByText } = render(<SitesListView />);

      expect(getByText('Popular sites')).toBeOnTheScreen();
    });

    it('renders all sites when not loading', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

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

      const { getAllByTestId } = render(<SitesListView />);

      const skeletons = getAllByTestId('site-skeleton');
      expect(skeletons.length).toBe(10);
    });

    it('renders empty state when no sites found', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        error: null,
      });

      const { getByText } = render(<SitesListView />);

      expect(getByText('No sites found')).toBeOnTheScreen();
    });
  });

  describe('search functionality', () => {
    it('filters sites by name', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'Meta');

      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(queryByTestId('site-item-2')).toBeNull();
      expect(queryByTestId('site-item-3')).toBeNull();
    });

    it('filters sites by display URL', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'uniswap.org');

      expect(queryByTestId('site-item-1')).toBeNull();
      expect(queryByTestId('site-item-2')).toBeNull();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });

    it('filters sites by full URL', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, queryByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'https://opensea');

      expect(queryByTestId('site-item-1')).toBeNull();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(queryByTestId('site-item-3')).toBeNull();
    });

    it('performs case-insensitive search', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'METAMASK');

      expect(getByTestId('site-item-1')).toBeOnTheScreen();
    });

    it('shows all sites when search query is empty', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, '');

      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });

    it('shows empty state when no results match search', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId, getByText } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'nonexistent site');

      expect(getByText('No sites found')).toBeOnTheScreen();
    });

    it('ignores whitespace in search query', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, '   ');

      // Should show all sites
      expect(getByTestId('site-item-1')).toBeOnTheScreen();
      expect(getByTestId('site-item-2')).toBeOnTheScreen();
      expect(getByTestId('site-item-3')).toBeOnTheScreen();
    });
  });

  describe('data fetching', () => {
    it('fetches sites with limit of 100', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      render(<SitesListView />);

      expect(mockUseSitesData).toHaveBeenCalledWith({ limit: 100 });
    });

    it('passes isViewAll prop to SiteRowItemWrapper', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const SiteRowItemWrapper = jest.requireMock(
        '../SectionSites/SiteRowItemWrapper',
      );

      render(<SitesListView />);

      expect(SiteRowItemWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          isViewAll: true,
        }),
        expect.anything(),
      );
    });

    it('passes isViewAll prop to SiteSkeleton', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: true,
        error: null,
      });

      const SiteSkeleton = jest.requireMock(
        '../SectionSites/SiteSkeleton/SiteSkeleton',
      );

      render(<SitesListView />);

      expect(SiteSkeleton).toHaveBeenCalledWith(
        expect.objectContaining({
          isViewAll: true,
        }),
        expect.anything(),
      );
    });
  });

  describe('navigation', () => {
    it('clears search query when cancel button is pressed', async () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'test query');

      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(searchInput.props.value).toBe('');
      });
    });
  });

  describe('accessibility', () => {
    it('autofocuses search input', () => {
      mockUseSitesData.mockReturnValue({
        sites: mockSites,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      const searchInput = getByTestId('search-input');
      expect(searchInput.props.autoFocus).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles sites with missing optional fields', () => {
      const sitesWithMissingFields: SiteData[] = [
        {
          id: '1',
          name: 'Test Site',
          url: 'https://test.com',
          displayUrl: 'test.com',
        },
      ];

      mockUseSitesData.mockReturnValue({
        sites: sitesWithMissingFields,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = render(<SitesListView />);

      expect(getByTestId('site-item-1')).toBeOnTheScreen();
    });

    it('handles empty sites array gracefully', () => {
      mockUseSitesData.mockReturnValue({
        sites: [],
        isLoading: false,
        error: null,
      });

      const { getByText } = render(<SitesListView />);

      expect(getByText('No sites found')).toBeOnTheScreen();
    });
  });
});
